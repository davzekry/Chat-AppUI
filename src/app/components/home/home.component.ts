import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FormsModule } from '@angular/forms'; // Import FormsModule
// Import our services and models
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service'; // Import AuthService
import { Room, PaginatedUsers, MessageHistory, Message } from '../../models/chat.models';
import { SignalrService } from '../../services/signalr.service'; // Import SignalrService
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageArea') private messageArea!: ElementRef;

  public rooms$!: Observable<Room[]>;
  public users$!: Observable<PaginatedUsers>;
  public messages$!: Observable<MessageHistory>;
  public selectedRoom: Room | null = null;
  public newMessageText: string = '';
  // Property to hold the current user's ID
  public currentUserId: string | null = null;
  private shouldScrollToBottom = false;
  public messages: Message[] = [];
  private messageSubscription!: Subscription;

  // Inject AuthService along with ChatService
  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    public signalrService: SignalrService // Inject SignalrService
  ) {}

  ngOnInit(): void {
    // Get the current user's ID when the component initializes
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadInitialData();

    // Start the SignalR connection
    this.signalrService.startConnection();

    // Subscribe to the message receiver
   this.messageSubscription = this.signalrService.messageReceived$.subscribe((realMessage: Message) => {
      // The backend MUST include the temporary ID in the response for this to work.
      // Let's assume the backend will echo back the tempId in a field, e.g., `clientMessageId`.
      // If not, we have to find another way to match them. For now, let's find by content and user.
      
      const tempMessageIndex = this.messages.findIndex(
        m => m.status === 'sending' && m.displayContent === realMessage.displayContent
      );

      if (tempMessageIndex !== -1) {
        // Replace the temporary message with the real one from the server
        this.messages[tempMessageIndex] = realMessage;
      } else if (this.selectedRoom && realMessage.roomId === this.selectedRoom.roomId) {
        // It's a message from another user, just add it
        this.messages.push(realMessage);
      }
      this.shouldScrollToBottom = true;
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false; // Reset the flag
    }
  }

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.signalrService.stopConnection(); // Optional: stop connection on logout/destroy
  }

  private loadInitialData(): void {
    this.rooms$ = this.chatService.getRooms().pipe(
      catchError((error) => {
        console.error('Error fetching rooms:', error);
        return of([]);
      })
    );

    this.users$ = this.chatService.getUsers().pipe(
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of({
          data: [],
          totalCount: 0,
          pageNumber: 1,
          pageSize: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          items: null,
        });
      })
    );
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    // Tell SignalR we are now listening to this room
    this.signalrService.joinRoom(room.roomId);

    // Fetch the initial message history
    this.chatService.getMessages(room.roomId).subscribe((history) => {
      this.messages = history.messages;
      this.shouldScrollToBottom = true;
    });
  }

  createAndSelectPrivateRoom(userId: string): void {
    this.chatService.createPrivateRoom(userId).subscribe({
      next: (success) => {
        if (success) {
          console.log('Private room created. Refreshing room list...');
          this.rooms$ = this.chatService.getRooms();
        }
      },
      error: (error) => console.error('Error creating private room:', error),
    });
  }

  // Helper method for the template to check message ownership
  isMessageSent(message: Message): boolean {
    if (!this.currentUserId || !message.userId) {
      return false;
    }
    return message.userId === this.currentUserId;
  }

  sendMessage(): void {
    if (!this.selectedRoom || !this.newMessageText.trim() || !this.currentUserId) {
      return;
    }

    const roomId = this.selectedRoom.roomId;
    const messageText = this.newMessageText;

    // 1. Create a temporary message
    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      roomId: roomId,
      userId: this.currentUserId,
      userName: 'You', // Placeholder
      userProfileImage: '', // Placeholder
      messageText: messageText,
      displayContent: messageText,
      createdAt: new Date().toISOString(),
      status: 'sending', // Set status to 'sending'
      // Fill other required fields with defaults
      messageType: 0,
      isEdited: false,
      fileMessage: null,
      voiceMessage: null,
    };

    // 2. Add it to the UI immediately
    this.messages.push(optimisticMessage);
    this.shouldScrollToBottom = true;
    this.newMessageText = '';

    // 3. Send the actual message to the service
    this.chatService.sendMessage(roomId, messageText).subscribe({
      next: (success) => {
        if (!success) {
          // If the API call itself fails, mark the message as failed
          const msg = this.messages.find(m => m.id === tempId);
          if (msg) msg.status = 'failed';
        }
        // We no longer need to do anything on success, as SignalR will handle it.
      },
      error: (err) => {
        console.error('Failed to send message:', err);
        // Mark the message as failed on network error
        const msg = this.messages.find(m => m.id === tempId);
        if (msg) msg.status = 'failed';
      },
    });
  }

  private scrollToBottom(): void {
    try {
      this.messageArea.nativeElement.scrollTop = this.messageArea.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }
}
