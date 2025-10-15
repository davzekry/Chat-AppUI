import { Component, Input, Output, EventEmitter } from '@angular/core';
// Import CommonModule or just the specific pipe you need
import { CommonModule } from '@angular/common'; 
import { Room } from '../../../models/chat.models';

@Component({
  selector: 'app-room-list',
  standalone: true, // This component is standalone
  imports: [CommonModule], // <-- ADD THIS to make *ngFor and pipes like 'date' available
  templateUrl: './rooms-list.component.html',
  styleUrls: ['./rooms-list.component.css']
})
export class RoomListComponent {
  @Input() rooms: Room[] | null = [];
  @Input() selectedRoomId: string | null = null;
  @Output() roomSelected = new EventEmitter<Room>();

  onRoomClick(room: Room): void {
    this.roomSelected.emit(room);
  }
}
