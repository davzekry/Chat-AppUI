import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User, PaginatedUsers } from '../../../models/chat.models'; // Adjust path if needed

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule], // For *ngFor
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent {
  @Input() users: PaginatedUsers | null = null;
  @Output() userSelected = new EventEmitter<User>();

  onUserClick(user: User): void {
    this.userSelected.emit(user);
  }
}
