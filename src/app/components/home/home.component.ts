// src/app/components/home/home.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { RoomsListComponent } from '../rooms-list/rooms-list.component';
import { UsersListComponent } from '../users-list/users-list.component';
import { MessagesComponent } from '../messages/messages.component';
import { ChatService } from '../../services/chat.service';

// UPDATED: Room and User interfaces (already done above, ensure consistency)
export interface Room {
  roomId: string; // Changed from 'id' to 'roomId'
  roomName: string | null; // Can be null for private chats
  imagePath: string | null; // Can be null for private chats
  roomType: 0 | 1; // 0: Private, 1: Group
  lastMessageAt?: string; // Changed from Date to string to match response
  // *** CRITICAL MISSING DATA: participants array or otherParticipant info for private rooms ***
  // For now, we'll assume a way to get the other participant's name/image.
  // Ideally, your backend should add:
  otherParticipant?: {
    userId: string;
    userName: string;
    userImage: string;
  };
}

// UPDATED: User Interface to match your backend's GetAllUsers response
export interface User {
  id: string;
  name: string; // Changed from 'userName' to 'name'
  imagePath?: string; // Changed from 'userImage' to 'imagePath'
  isOnline: boolean; // Added
  // Email is not in this response, so removed. If needed, fetch from profile endpoint.
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RoomsListComponent, UsersListComponent, MessagesComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  chatService = inject(ChatService);

  currentUserName: string = 'User';
  currentUserId: string | null = null; // Store current user ID
  selectedRoomId: string | null = null;
  selectedRoomName: string | null = null;
  selectedRoomType: 0 | 1 | null = null; // Store room type

  ngOnInit(): void {
    const token = this.authService.getToken();
    if (token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const payload = JSON.parse(jsonPayload);
      this.currentUserName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'User';
      this.currentUserId = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null;
    }

    this.chatService.startConnection();
  }

  onRoomSelected(room: Room): void {
    // Leave previous room group if any
    if (this.selectedRoomId && this.selectedRoomId !== room.roomId) {
      this.chatService.leaveRoomGroup(this.selectedRoomId);
    }

    this.selectedRoomId = room.roomId;
    this.selectedRoomName = room.roomName; // This can be null, handled in RoomsListComponent
    this.selectedRoomType = room.roomType;

    // Join the new room group for SignalR
    this.chatService.joinRoomGroup(room.roomId);

    console.log('Room selected in Home:', room.roomName || 'Private Chat', room.roomId);
  }

  onUserSelected(user: User): void {
    console.log('User selected in Home:', user.name);
    // Logic to create a private room and then select it
    this.chatService.createPrivateRoom(user.id).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data === true) {
          console.log('Private room creation/check initiated. Rooms list will refresh.');
          // The roomsListRefresh$ subject in ChatService will trigger RoomsListComponent to reload.
          // After rooms are reloaded, RoomsListComponent should emit the newly created/found room.
          // For now, we'll wait for the RoomsListComponent to emit the selected room.
          // Or, you could try to optimistically find the room if it's new.
        } else {
          console.error('Failed to create private room:', response.message);
        }
      },
      error: (err) => console.error('Error creating private room:', err)
    });
  }

  logout(): void {
    this.chatService.stopConnection(); // Stop SignalR on logout
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('Logout failed', err);
        this.authService.removeToken();
        this.router.navigate(['/login']);
      },
    });
  }
}