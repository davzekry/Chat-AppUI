import { Component, Input, OnChanges, SimpleChanges, inject, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../services/chat.service';
import { Message } from '../../../interfaces/chat.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './messages-list.component.html',
  styleUrls: ['./messages-list.component.css']
})
export class MessagesComponent implements OnChanges, OnDestroy, AfterViewChecked {
  @Input() roomId: string | null = null;
  @Input() currentUserId: string | null = null;
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  private chatService = inject(ChatService);
  messages: Message[] = [];
  newMessageText: string = '';
  private destroy$ = new Subject<void>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roomId'] && this.roomId) {
      this.loadMessages();
      this.chatService.newMessage$.pipe(takeUntil(this.destroy$)).subscribe(message => {
        if (message && message.roomId === this.roomId) {
          this.messages.push(message);
        }
      });
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMessages(): void {
    if (this.roomId) {
      this.chatService.getMessages(this.roomId).subscribe(response => {
        this.messages = response.messages;
      });
    }
  }

  sendMessage(): void {
    if (this.newMessageText.trim() && this.roomId) {
      this.chatService.sendMessage(this.roomId, this.newMessageText).subscribe(() => {
        this.newMessageText = '';
      });
    }
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
