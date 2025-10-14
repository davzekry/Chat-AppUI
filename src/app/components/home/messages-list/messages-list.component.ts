import { Component, Input, OnChanges, SimpleChanges, inject, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Message, Room } from '../../../interfaces/chat.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-messages-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './messages-list.component.html',
  styleUrls: ['./messages-list.component.css']
})
export class MessagesListComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() selectedRoom: Room | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  messages: Message[] = [];
  currentUserId: string | null = null;
  private destroy$ = new Subject<void>();
  baseApiUrl = environment.apiUrl;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedRoom'] && this.selectedRoom) {
      this.loadMessages();
      this.chatService.joinRoomGroup(this.selectedRoom.roomId);
      this.chatService.newMessage$.pipe(takeUntil(this.destroy$)).subscribe(message => {
        if (message && message.roomId === this.selectedRoom?.roomId) {
          this.messages.push(message);
        }
      });
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.selectedRoom) {
      this.chatService.leaveRoomGroup(this.selectedRoom.roomId);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMessages(): void {
    if (this.selectedRoom) {
      this.chatService.getMessages(this.selectedRoom.roomId).subscribe(response => {
        this.messages = response.messages;
      });
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
