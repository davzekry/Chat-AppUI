import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoomsListComponent } from './rooms-list/rooms-list.component';
import { UsersListComponent } from './users-list/users-list.component';
import { MessagesListComponent } from './messages-list/messages-list.component';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Room, User } from '../../interfaces/chat.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RoomsListComponent, UsersListComponent, MessagesListComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);

  selectedRoom: Room | null = null;
  currentUserId: string | null = null;
  newMessageText: string = '';

  ngOnInit(): void {
    this.currentUserId = this.authService.getLoggedInUserId();
  }

  onRoomSelected(room: Room): void {
    this.selectedRoom = room;
  }

  onUserSelected(user: User): void {
    const privateRoom: Room = {
      roomId: `private-${this.currentUserId}-${user.id}`,
      roomName: user.name,
      isPrivate: true
    };
    this.selectedRoom = privateRoom;
  }

  sendMessage(): void {
    if (this.newMessageText.trim() && this.selectedRoom) {
      this.chatService.sendMessage(this.selectedRoom.roomId, this.newMessageText).subscribe(() => {
        this.newMessageText = '';
      });
    }
  }
}
