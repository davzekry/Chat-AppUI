import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Import AuthService and ChatService
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

// Import the central interfaces
import { Room, User } from './../../interfaces/chat.interface';

// Import child components (will be created in subsequent steps)
import { RoomsListComponent } from './rooms-list/rooms-list.component';
import { UsersListComponent } from './users-list/users-list.component';
import { MessagesComponent } from './messages/messages.component';


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RoomsListComponent, // Will be imported once created
    UsersListComponent, // Will be imported once created
    MessagesComponent   // Will be imported once created
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'], // Using .css as requested
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  chatService = inject(ChatService);

  currentUserName: string | null = null;
  currentUserId: string | null = null;

  selectedRoomId: string | null = null;
  selectedRoomName: string | null = null;
  selectedRoomType: 0 | 1 | null = null;

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.currentUserName = this.authService.getCurrentUserName();

    // Start SignalR connection when Home component initializes
    this.chatService.startConnection();
  }

  // Event handler for when a room is selected from RoomsListComponent
  onRoomSelected(room: Room): void {
    // Leave previous room group if any
    if (this.selectedRoomId && this.selectedRoomId !== room.roomId) {
      this.chatService.leaveRoomGroup(this.selectedRoomId);
    }

    this.selectedRoomId = room.roomId;
    this.selectedRoomName = room.roomName;
    this.selectedRoomType = room.roomType;

    // Join the new room group for SignalR
    this.chatService.joinRoomGroup(room.roomId);

    console.log('HomeComponent: Room selected:', room.roomName || 'Private Chat', 'ID:', room.roomId);
  }

  // Event handler for when a user is selected from UsersListComponent (to initiate private chat)
  onUserSelected(user: User): void {
    console.log('HomeComponent: User selected for private chat:', user.name, 'ID:', user.id);
    // Logic to create a private room and then select it
    this.chatService.createPrivateRoom(user.id).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data === true) {
          console.log('HomeComponent: Private room creation/check initiated.');
          // Request rooms list refresh, the rooms-list component will handle selecting the new room
          this.chatService.requestRoomsListRefresh();
        } else {
          console.error('HomeComponent: Failed to create private room:', response.message);
        }
      },
      error: (err) => console.error('HomeComponent: Error creating private room:', err)
    });
  }

  logout(): void {
    this.chatService.stopConnection(); // Stop SignalR on logout
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('HomeComponent: Logout failed', err);
        // Even if API logout fails, clear token client-side and redirect
        // The authService.logout() already handles localStorage.removeItem
        this.router.navigate(['/login']);
      },
    });
  }
}