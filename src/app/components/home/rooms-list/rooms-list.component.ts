import { Component, OnInit, Output, EventEmitter, Input, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { Room, User, Message } from '../../../interfaces/chat.interface'; // Import necessary interfaces
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment'; // To get apiUrl for image paths

@Component({
  selector: 'app-rooms-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rooms-list.component.html',
  styleUrls: ['./rooms-list.component.css'], // Using .css
})
export class RoomsListComponent implements OnInit, OnDestroy {
  @Input() selectedRoomId: string | null = null;
  @Output() roomSelected = new EventEmitter<Room>();

  chatService = inject(ChatService);
  authService = inject(AuthService);

  rooms: Room[] = [];
  allUsers: User[] = []; // To help resolve private chat names/images
  currentUserId: string | null = null;
  private destroy$ = new Subject<void>();

  private baseApiUrl = environment.apiUrl; // For constructing full image paths

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();

    // Load all users for lookup to correctly display private chat names/images
    this.loadAllUsersForLookup();
    // Load the initial list of rooms
    this.loadUserRooms();

    // Subscribe to new messages for real-time updates on last message time
    this.chatService.newMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe((message) => {
        if (message) {
          this.updateRoomLastMessage(message);
        }
      });

    // Subscribe to refresh signals (e.g., when a new private room is created)
    this.chatService.roomsListRefresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe((refresh) => {
        if (refresh) {
          console.log('RoomsListComponent: Refreshing rooms list...');
          this.loadUserRooms(); // Reload rooms
          // No need to reset roomsListRefresh$ here, chatService handles it.
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all registered users to help identify participants in private rooms.
   */
  loadAllUsersForLookup(): void {
    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        if (response.status === 200 && response.data && response.data.data) {
          this.allUsers = response.data.data;
          console.log('RoomsListComponent: All users for lookup loaded:', this.allUsers.length);
        } else {
          console.error('RoomsListComponent: Failed to load all users for lookup:', response.message);
        }
      },
      error: (err) => console.error('RoomsListComponent: Error loading all users for lookup:', err),
    });
  }

  /**
   * Fetches the list of rooms the current user is a part of.
   * Enriches private room data using the allUsers list.
   */
  loadUserRooms(): void {
    this.chatService.getUserRooms().subscribe({
      next: (response) => {
        if (response.status === 200 && response.data) {
          // Process rooms to derive display name and image for private chats
          this.rooms = response.data.map(room => {
            if (room.roomType === 0 && this.currentUserId) { // Private chat
              // Backend doesn't provide otherParticipant directly in GetAllRoomsByUserId.
              // We need to fetch messages to get the other userId, or the backend should provide it.
              // For a robust solution, backend MUST return the other participant's ID.
              // As a temporary workaround, we'll try to guess if possible or use generic placeholders.
              // The ideal scenario is 'room.otherParticipant' being populated by the API.

              // For now, if roomName is null, we try to derive it or use a placeholder.
              // To derive the other participant's name/image, we'd typically need
              // the other participant's ID within the `Room` object itself from the backend.
              // Since it's not present, we will rely on a generic name.

              return {
                ...room,
                roomName: room.roomName || 'Private Chat', // Use backend name if exists, else placeholder
                // imagePath: room.imagePath || 'https://via.placeholder.com/40?text=PC' // Placeholder if no image
                // To display the other user's image, we'd need their ID from the room object.
              };
            }
            return room;
          });
          console.log('RoomsListComponent: User rooms loaded:', this.rooms);

          // If no room is currently selected and there are rooms available, select the first one.
          if (!this.selectedRoomId && this.rooms.length > 0) {
            this.selectRoom(this.rooms[0]);
          } else if (this.selectedRoomId && !this.rooms.some(r => r.roomId === this.selectedRoomId)) {
            // If the previously selected room is no longer in the list (e.g., deleted), clear selection
            this.selectedRoomId = null;
            this.roomSelected.emit(null!); // Clear selection in parent
          } else if (this.selectedRoomId) {
            // If there's a selected room, re-emit it in case its data was updated (e.g., last message)
            const currentlySelectedRoom = this.rooms.find(r => r.roomId === this.selectedRoomId);
            if (currentlySelectedRoom) {
              this.roomSelected.emit(currentlySelectedRoom);
            }
          }

        } else {
          console.error('RoomsListComponent: Failed to load user rooms:', response.message);
          this.rooms = []; // Clear rooms on failure
        }
      },
      error: (err) => {
        console.error('RoomsListComponent: Error loading user rooms:', err);
        this.rooms = []; // Clear rooms on error
      },
    });
  }

  /**
   * Emits the selected room to the parent component.
   * @param room The room to select.
   */
  selectRoom(room: Room): void {
    this.selectedRoomId = room.roomId; // Update local selection
    this.roomSelected.emit(room);
    console.log('RoomsListComponent: Selected room:', room.roomId);
  }

  /**
   * Updates the last message time for a room when a new message is received.
   * Also reorders the rooms to bring the updated room to the top.
   * @param newMessage The newly received message.
   */
  private updateRoomLastMessage(newMessage: Message): void {
    const roomIndex = this.rooms.findIndex((r) => r.roomId === newMessage.roomId);
    if (roomIndex !== -1) {
      this.rooms[roomIndex].lastMessageAt = newMessage.createdAt; // Update last message time
      // Optional: reorder rooms so the one with the new message is at the top
      const [movedRoom] = this.rooms.splice(roomIndex, 1);
      this.rooms.unshift(movedRoom);
    }
  }

  /**
   * Determines the display name for a room.
   * For private chats, tries to find the other participant's name using `allUsers`.
   * @param room The room object.
   * @returns The display name for the room.
   */
  getRoomDisplayName(room: Room): string {
    if (room.roomType === 0) { // Private chat
      // Your backend currently returns roomName: null for private chats.
      // To get the other participant's name, the backend must provide their ID in the Room object.
      // Since it doesn't, we can't reliably look it up from `allUsers` using only `roomId`.
      // For now, using a generic name.
      return room.roomName || 'Private Chat';
    }
    return room.roomName || 'Group Chat'; // Fallback for group chat if name is null
  }

  /**
   * Determines the display image for a room.
   * For private chats, tries to find the other participant's image.
   * @param room The room object.
   * @returns The URL of the room's display image.
   */
  getRoomDisplayImage(room: Room): string {
    // If backend provides a specific imagePath for the room
    if (room.imagePath) {
      // Assuming imagePath from backend is a relative path like '/uploads/image.jpg'
      return `${this.baseApiUrl}${room.imagePath}`;
    }

    if (room.roomType === 0) { // Private chat
      // Similar to display name, without otherParticipant's ID, we cannot get their specific image.
      return 'https://via.placeholder.com/40?text=PC'; // Default Private Chat placeholder
    } else { // Group chat (or other types)
      return 'https://via.placeholder.com/40?text=GC'; // Default Group Chat placeholder
    }
  }
}