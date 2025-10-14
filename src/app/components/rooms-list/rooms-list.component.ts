// src/app/components/home/rooms-list/rooms-list.component.ts
import { Component, OnInit, Output, EventEmitter, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService, Message } from '../../services/chat.service';
import { Room, User } from '../home/home.component'; // Import User for potential lookup
import { AuthService } from '../../services/auth.service'; // To get current user ID
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-rooms-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rooms-list.component.html',
  styleUrls: ['./rooms-list.component.scss'],
})
export class RoomsListComponent implements OnInit, OnDestroy {
  @Input() selectedRoomId: string | null = null;
  @Output() roomSelected = new EventEmitter<Room>();

  chatService = inject(ChatService);
  authService = inject(AuthService); // Inject AuthService to get current user ID

  rooms: Room[] = [];
  allUsers: User[] = []; // Will store all users to help resolve private chat names/images
  currentUserId: string | null = null;

  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId(); // Assuming you add this method to AuthService

    this.loadAllUsersForLookup(); // Load all users once
    this.loadUserRooms();

    this.chatService.newMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        if (message) {
          this.updateRoomLastMessage(message);
        }
      });

    this.chatService.roomsListRefresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe((refresh) => {
        if (refresh) {
          this.loadUserRooms(); // Reload rooms when a new private room is made
          this.chatService.requestRoomsListRefresh(); // Reset the subject
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper method to get current user ID (add this to AuthService)
  // You might want to add this to AuthService:
  // getCurrentUserId(): string | null {
  //   const token = this.getToken();
  //   if (token) {
  //     const base64Url = token.split('.')[1];
  //     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  //     const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
  //         return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  //     }).join(''));
  //     const payload = JSON.parse(jsonPayload);
  //     return payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] || null;
  //   }
  //   return null;
  // }


  // Load all users to help identify private chat participants
  loadAllUsersForLookup(): void {
    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        if (response.status === 200 && response.data && response.data.data) {
          this.allUsers = response.data.data;
          console.log('All users for lookup loaded:', this.allUsers);
        }
      },
      error: (err) => console.error('Error loading all users for lookup:', err),
    });
  }

  loadUserRooms(): void {
    this.chatService.getUserRooms().subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          this.rooms = response.data.map(room => {
            // Attempt to enrich private room data if roomName is null
            if (room.roomType === 0 && !room.roomName && !room.imagePath) {
              // This is a placeholder. You NEED a way from backend to know the other participant.
              // For now, we'll try to guess based on a naming convention or fetching messages.
              // A better solution: backend's GetAllRoomsByUserId should include `otherParticipantId` for private rooms.
              // If `otherParticipant` is not provided by backend, this logic is heuristic.
              // For demonstration, let's assume `roomName` will be set by the backend for private chats later,
              // or we need to derive it from the other user ID if we can get it.

              // For now, if roomName is null, we set a default name.
              // We CANNOT reliably get the other participant's image without more backend data.
              return {
                ...room,
                roomName: 'Private Chat', // Placeholder
                imagePath: 'https://via.placeholder.com/40?text=PC' // Placeholder
              };
            }
            return room;
          });
          console.log('User rooms loaded:', this.rooms);

          // If a new room was just created, try to select it.
          // This requires a more complex logic, as 'createPrivateRoom' returns boolean.
          // Simplest for now: if rooms change, and nothing is selected, select the first.
          if (!this.selectedRoomId && this.rooms.length > 0) {
            this.selectRoom(this.rooms[0]);
          } else if (this.selectedRoomId && !this.rooms.some(r => r.roomId === this.selectedRoomId)) {
            // If the selected room is no longer in the list (e.g., deleted), clear selection
            this.selectedRoomId = null;
            this.roomSelected.emit(null!); // Clear selection in parent
          }
        } else {
          console.error('Failed to load user rooms:', response.message);
        }
      },
      error: (err) => console.error('Error loading user rooms:', err),
    });
  }

  selectRoom(room: Room): void {
    this.selectedRoomId = room.roomId; // Update local selection
    this.roomSelected.emit(room);
  }

  private updateRoomLastMessage(newMessage: Message): void {
    const roomIndex = this.rooms.findIndex((r) => r.roomId === newMessage.roomId);
    if (roomIndex !== -1) {
      this.rooms[roomIndex].lastMessageAt = newMessage.createdAt.toString(); // Update last message time
      // Optional: reorder rooms so the one with the new message is at the top
      const [movedRoom] = this.rooms.splice(roomIndex, 1);
      this.rooms.unshift(movedRoom);
    }
  }

  getRoomDisplayName(room: Room): string {
    if (room.roomType === 0) { // Private chat
      // If backend doesn't provide a direct name, we need to try and find the other participant.
      // This is a major assumption and requires backend cooperation.
      // For now, if roomName is null, return a generic "Private Chat" or try to find a user.
      if (room.roomName) return room.roomName;

      // WORKAROUND: If backend only gives room ID, we need to infer the other user.
      // This is not ideal as we don't have participant IDs in the room object.
      // We would need a separate endpoint like `/api/Room/{roomId}/Participants`
      // For now, a generic name:
      return 'Private Chat'; // Fallback if backend doesn't provide a name
    }
    return room.roomName || 'Group Chat'; // Group chat name, fallback if null
  }

  getRoomDisplayImage(room: Room): string {
    // If backend provides a specific imagePath for the room (e.g., group icon or other participant's image)
    if (room.imagePath) {
      // Assuming imagePath from backend is a relative path like '/uploads/image.jpg'
      // You might need to prepend your API base URL if images are served from there
      return `https://dchatapp.runasp.net${room.imagePath}`;
    }
    // Fallback based on room type
    if (room.roomType === 0) { // Private chat
      // Placeholder image for private chat if no specific imagePath is given
      return 'https://via.placeholder.com/40?text=PC';
    } else { // Group chat (or other types)
      return 'https://via.placeholder.com/40?text=G'; // Default Group placeholder
    }
  }
}