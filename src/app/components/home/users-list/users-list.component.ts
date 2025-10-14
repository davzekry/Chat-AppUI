import { Component, OnInit, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../../services/chat.service';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../interfaces/chat.interface'; // Import the User interface
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../environments/environment'; // To get apiUrl for image paths

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css'], // Using .css
})
export class UsersListComponent implements OnInit, OnDestroy {
  @Output() userSelected = new EventEmitter<User>(); // Emits the selected user

  chatService = inject(ChatService);
  authService = inject(AuthService);

  users: User[] = [];
  currentUserId: string | null = null;
  private destroy$ = new Subject<void>();

  private baseApiUrl = environment.apiUrl; // For constructing full image paths

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadAllUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Loads all registered users from the backend.
   * Filters out the current user from the list.
   */
  loadAllUsers(): void {
    this.chatService.getAllUsers().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.status === 200 && response.data && response.data.data) {
          // Filter out the current user from the list
          this.users = response.data.data.filter(user => user.id !== this.currentUserId);
          console.log('UsersListComponent: All users loaded (excluding current user):', this.users.length);
        } else {
          console.error('UsersListComponent: Failed to load users:', response.message);
        }
      },
      error: (err) => console.error('UsersListComponent: Error loading users:', err),
    });
  }

  /**
   * Emits the selected user to the parent component.
   * @param user The selected user.
   */
  selectUser(user: User): void {
    this.userSelected.emit(user);
    console.log('UsersListComponent: User selected for private chat:', user.name);
  }

  /**
   * Returns the full URL for the user's profile image.
   * @param user The user object.
   * @returns The URL of the user's profile image.
   */
  getUserDisplayImage(user: User): string {
    if (user.imagePath) {
      // Assuming imagePath from backend is a relative path like '/uploads/image.jpg'
      return `${this.baseApiUrl}${user.imagePath}`;
    }
    return 'https://via.placeholder.com/40?text=U'; // Default placeholder image
  }
}