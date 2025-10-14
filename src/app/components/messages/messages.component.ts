// src/app/components/home/messages/messages.component.ts
import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, Message } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss'],
})
export class MessagesComponent implements OnChanges, OnInit, OnDestroy {
  @Input() roomId: string | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  chatService = inject(ChatService);
  authService = inject(AuthService);

  messages: Message[] = [];
  newMessageContent = '';
  messageLengthLimit = 150;
  currentUserId: string | null = null;
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Get current user ID from JWT token for message alignment
    const token = this.authService.getToken();
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      this.currentUserId = payload.http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier || null; // Adjust claim name
    }

    // Subscribe to new real-time messages
    this.chatService.newMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        if (message && message.roomId === this.roomId) {
          this.messages.push(message);
          this.scrollToBottom();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roomId'] && this.roomId) {
      this.loadMessages(this.roomId);
    } else if (changes['roomId'] && !this.roomId) {
      this.messages = []; // Clear messages if room is unselected
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMessages(roomId: string): void {
    this.chatService.getRoomMessages(roomId).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          this.messages = response.data;
          console.log(`Messages for room ${roomId} loaded:`, this.messages);
          this.scrollToBottom();
        } else {
          console.error('Failed to load room messages:', response.message);
          this.messages = [];
        }
      },
      error: (err) => {
        console.error('Error loading room messages:', err);
        this.messages = [];
      },
    });
  }

  sendMessage(): void {
    if (this.newMessageContent.trim() && this.roomId) {
      const messageToSend = this.newMessageContent.trim().substring(0, this.messageLengthLimit);

      // Send via SignalR
      this.chatService.sendMessage(this.roomId, messageToSend).then(() => {
        console.log('Message sent via SignalR');
        this.newMessageContent = ''; // Clear input
      }).catch(err => {
        console.error('Failed to send message via SignalR:', err);
        // Optionally, add a local "failed to send" state to the message
      });
    }
  }

  private scrollToBottom(): void {
    // Use a small timeout to ensure DOM has rendered new messages
    setTimeout(() => {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    }, 50);
  }

  isMyMessage(message: Message): boolean {
    return message.senderId === this.currentUserId;
  }

  getMessageImage(message: Message): string {
    return message.senderUserImage || 'https://via.placeholder.com/30?text=U';
  }
}