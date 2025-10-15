import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // For ngModel

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.css']
})
export class MessageInputComponent {
  @Input() isDisabled: boolean = false;
  @Output() messageSent = new EventEmitter<string>();

  public newMessageText: string = '';

  sendMessage(): void {
    if (!this.newMessageText.trim()) {
      return;
    }
    this.messageSent.emit(this.newMessageText);
    this.newMessageText = ''; // Clear the input after sending
  }
}
