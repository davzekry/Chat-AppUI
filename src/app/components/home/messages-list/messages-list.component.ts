import { Component, Input, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Message } from '../../../models/chat.models'; // Adjust path

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule], // For *ngFor, *ngIf, and 'date' pipe
  templateUrl: './messages-list.component.html',
  styleUrls: ['./messages-list.component.css']
})
export class MessageListComponent implements AfterViewChecked {
  @Input() messages: Message[] = [];
  @Input() currentUserId: string | null = null;
  
  @ViewChild('messageArea') private messageArea!: ElementRef;

  // We scroll whenever the view is checked and there are messages
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  isMessageSent(message: Message): boolean {
    if (!this.currentUserId || !message.userId) {
      return false;
    }
    return message.userId === this.currentUserId;
  }

  private scrollToBottom(): void {
    try {
      this.messageArea.nativeElement.scrollTop = this.messageArea.nativeElement.scrollHeight;
    } catch (err) {
      // It's fine, the element might not be ready yet
    }
  }
}
