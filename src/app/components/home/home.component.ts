import { Component, OnInit, OnDestroy } from '@angular/core'; // REMOVED: ViewChild, ElementRef, AfterViewChecked
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Observable, of, BehaviorSubject, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';

// Import our services and models
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Room, PaginatedUsers, MessageHistory, Message, CreateRoomResponse, User } from '../../models/chat.models';
import { SignalrService } from '../../services/signalr.service';

// Import Child Components
import { RoomListComponent } from "./rooms-list/rooms-list.component";
import { UsersListComponent } from "./users-list/users-list.component";
import { MessageListComponent } from './messages-list/messages-list.component';
import { MessageInputComponent } from './message-input/message-input.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    RoomListComponent,
    UsersListComponent,
    MessageListComponent,
    MessageInputComponent
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
} )
// REMOVED: AfterViewChecked from implements list
export class HomeComponent implements OnInit, OnDestroy {
  // REMOVED: @ViewChild('messageArea')

  public rooms$!: Observable<Room[]>;
  public users$ = new BehaviorSubject<PaginatedUsers | null>(null);
  public selectedRoom: Room | null = null;
  public currentUserId: string | null = null;
  public messages: Message[] = [];
  
  private messageSubscription!: Subscription;
  
  // REMOVED: shouldScrollToBottom property

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    public signalrService: SignalrService
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadInitialData();
    this.signalrService.startConnection();

    this.messageSubscription = this.signalrService.messageReceived$.subscribe((realMessage: Message) => {
      const tempMessageIndex = this.messages.findIndex(
        m => m.status === 'sending' && m.displayContent === realMessage.displayContent
      );

      if (tempMessageIndex !== -1) {
        this.messages[tempMessageIndex] = realMessage;
      } else if (this.selectedRoom && realMessage.roomId === this.selectedRoom.roomId) {
        this.messages.push(realMessage);
      }
      // REMOVED: this.shouldScrollToBottom = true;
    });
  }

  // REMOVED: ngAfterViewChecked() method

  ngOnDestroy(): void {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    this.signalrService.stopConnection();
  }

  private loadInitialData(): void {
    this.rooms$ = this.chatService.getRooms(); // Simplified this line

    this.chatService.getUsers().pipe(
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of(null);
      })
    ).subscribe(users => this.users$.next(users));
  }

  selectRoom(room: Room): void {
    this.selectedRoom = room;
    this.signalrService.joinRoom(room.roomId);

    this.chatService.getMessages(room.roomId).subscribe((history) => {
      this.messages = history.messages;
      // REMOVED: this.shouldScrollToBottom = true;
    });
  }

  createAndSelectPrivateRoom(userToChatWith: User): void {
    if (userToChatWith.id === this.currentUserId) {
      return;
    }

    this.chatService.createPrivateRoom(userToChatWith.id).subscribe({
      next: (response: CreateRoomResponse) => {
        console.log('Accessed private room, ID:', response.roomId);

        const newRoomForSelection: Room = {
          roomId: response.roomId,
          roomName: userToChatWith.name,
          imagePath: userToChatWith.imagePath,
          roomType: 0,
          lastMessageAt: response.lastUpdated,
        };

        this.selectRoom(newRoomForSelection);
        this.rooms$ = this.chatService.getRooms();
      },
      error: (error) => console.error('Error creating or accessing private room:', error),
    });
  }

  sendMessage(messageText: string): void {
    if (!this.selectedRoom || !this.currentUserId) {
      return;
    }

    const roomId = this.selectedRoom.roomId;

    const tempId = `temp_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      roomId: roomId,
      userId: this.currentUserId,
      userName: 'You',
      userProfileImage: '',
      messageText: messageText,
      displayContent: messageText,
      createdAt: new Date().toISOString(),
      status: 'sending',
      messageType: 0,
      isEdited: false,
      fileMessage: null,
      voiceMessage: null,
    };

    this.messages.push(optimisticMessage);

    this.chatService.sendMessage(roomId, messageText).subscribe({
      next: (success) => {
        if (!success) {
          const msg = this.messages.find(m => m.id === tempId);
          if (msg) msg.status = 'failed';
        }
      },
      error: (err) => {
        console.error('Failed to send message:', err);
        const msg = this.messages.find(m => m.id === tempId);
        if (msg) msg.status = 'failed';
      },
    });
  }

  // REMOVED: scrollToBottom() method
  // REMOVED: isMessageSent() method (this logic is now in MessageListComponent)
}
