import { Component, EventEmitter, Output, Input, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from './../../services/chat.service';
import { Room } from './../../interfaces/chat.interface';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-rooms-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rooms-list.component.html',
  styleUrls: ['./rooms-list.component.css']
})
export class RoomsListComponent implements OnInit, OnDestroy {
  @Input() selectedRoomId: string | null = null;
  @Output() roomSelected = new EventEmitter<Room>();

  private chatService = inject(ChatService);
  rooms: Room[] = [];
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadRooms();
    this.chatService.roomsListRefresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(mustRefresh => {
        if (mustRefresh) {
          this.loadRooms();
        }
      });
  }

  loadRooms(): void {
    this.chatService.getUserRooms().subscribe(response => {
      this.rooms = response.data;
    });
  }

  selectRoom(room: Room): void {
    this.roomSelected.emit(room);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
