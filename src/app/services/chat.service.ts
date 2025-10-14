import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment'; // Assuming this path is correct
import { AuthService } from './auth.service';
import * as signalR from '@microsoft/signalr';
import {
  CustomeResponse,
  Room,
  User,
  Message,
  GetAllUsersResponseData,
  GetAllMessagesByRoomIdResponseData
} from '../interfaces/chat.interface'; // Use central interfaces

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  private signalRUrl = environment.signalRUrl;
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private hubConnection: signalR.HubConnection | null = null;
  private newMessagesSubject = new BehaviorSubject<Message | null>(null);
  newMessages$ = this.newMessagesSubject.asObservable();

  private roomsListRefreshSubject = new BehaviorSubject<boolean>(false);
  roomsListRefresh$ = this.roomsListRefreshSubject.asObservable();

  constructor() {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  // --- SignalR Methods (basic stubs for now) ---
  startConnection(): void {
    // Implement SignalR connection logic here
    console.log('SignalR connection stub: startConnection');
  }

  stopConnection(): void {
    // Implement SignalR disconnection logic here
    console.log('SignalR connection stub: stopConnection');
  }

  joinRoomGroup(roomId: string): Promise<void> {
    console.log(`SignalR stub: Join room group ${roomId}`);
    return Promise.resolve();
  }

  leaveRoomGroup(roomId: string): Promise<void> {
    console.log(`SignalR stub: Leave room group ${roomId}`);
    return Promise.resolve();
  }

  sendMessage(roomId: string, messageContent: string): Promise<void> {
    console.log(`SignalR stub: Send message to room ${roomId}: ${messageContent}`);
    return Promise.resolve();
  }

  // --- API Methods (basic stubs for now) ---

  getUserRooms(): Observable<CustomeResponse<Room[]>> {
    console.log('API stub: Get user rooms');
    // Implement actual HTTP call here
    return this.http.get<CustomeResponse<Room[]>>(
      `${this.apiUrl}/Room/GetAllRoomsByUserId`,
      { headers: this.getAuthHeaders() }
    );
  }

  getAllUsers(): Observable<CustomeResponse<GetAllUsersResponseData>> {
    console.log('API stub: Get all users');
    // Implement actual HTTP call here
    return this.http.get<CustomeResponse<GetAllUsersResponseData>>(
      `${this.apiUrl}/AppUser/GetAllUsers`,
      { headers: this.getAuthHeaders() }
    );
  }

  getRoomMessages(roomId: string): Observable<CustomeResponse<GetAllMessagesByRoomIdResponseData>> {
    console.log(`API stub: Get messages for room ${roomId}`);
    // Implement actual HTTP call here
    const params = new HttpParams().set('RoomId', roomId);
    return this.http.get<CustomeResponse<GetAllMessagesByRoomIdResponseData>>(
      `${this.apiUrl}/Message/GetAllMessagesByRoomId`,
      { headers: this.getAuthHeaders(), params }
    );
  }

  createPrivateRoom(otherUserId: string): Observable<CustomeResponse<boolean>> {
    console.log(`API stub: Create private room with user ${otherUserId}`);
    // Implement actual HTTP call here
    const body = { userId: otherUserId };
    return this.http.post<CustomeResponse<boolean>>(
      `${this.apiUrl}/Room/CreatePrivateRoom`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  requestRoomsListRefresh(): void {
    this.roomsListRefreshSubject.next(true); // Signal to refresh rooms list
  }
}