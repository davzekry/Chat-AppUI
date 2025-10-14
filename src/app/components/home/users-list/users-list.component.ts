import { Component, EventEmitter, Output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './../../../services/chat.service';
import { User } from './../../../interfaces/chat.interface';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.css']
})
export class UsersListComponent implements OnInit {
  @Output() userSelected = new EventEmitter<User>();
  private chatService = inject(ChatService);
  users: User[] = [];

  ngOnInit(): void {
    this.chatService.getAllUsers().subscribe(response => {
      this.users = response.data.data;
    });
  }

  selectUser(user: User): void {
    this.userSelected.emit(user);
  }
}
