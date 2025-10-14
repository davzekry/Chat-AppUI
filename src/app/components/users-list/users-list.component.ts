// src/app/components/home/users-list/users-list.component.ts
import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { User } from '../home/home.component';
import { AuthService } from '../../services/auth.service'; // To filter out current user

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
})
export class UsersListComponent implements OnInit {
  @Output() userSelected = new EventEmitter<User>();

  chatService = inject(ChatService);
  authService = inject(AuthService);

  users: User[] = []; // List of all registered users
  currentUserId: string | null = null;

  ngOnInit(): void {
    this.currentUserId = this.authService.getCurrentUserId();
    this.loadAllUsers();
  }

  loadAllUsers(): void {
    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        if (response.status === 200 && response.data && response.data.data) {
          // Filter out the currently logged-in user
          this.users = response.data.data.filter(user => user.id !== this.currentUserId);
          console.log('All users loaded:', this.users);
        } else {
          console.error('Failed to load all users:', response.message);
        }
      },
      error: (err) => console.error('Error loading all users:', err),
    });
  }

  selectUser(user: User): void {
    this.userSelected.emit(user);
  }

  getUserImageUrl(user: User): string {
    // Assuming imagePath from backend is a relative path like '/uploads/image.jpg'
    // You might need to prepend your API base URL if images are served from there
    return user.imagePath ? `https://dchatapp.runasp.net${user.imagePath}` : 'https://via.placeholder.com/40?text=U'; // Default placeholder
  }
}