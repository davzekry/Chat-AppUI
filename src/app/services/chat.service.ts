import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import * as signalR from '@microsoft/signalr';
import {
  CustomeResponse,
  Room,
  User,
  Message,
  GetAllUsersResponseData,
  PaginatedMessages
} from '../interfaces/chat.interface';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = environment.apiUrl;
  private signalRUrl = environment.signalRUrl;
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private hubConnection: signalR.HubConnection | null = null;
  private newMessageSubject = new Subject<Message>();
  public newMessage$ = this.newMessageSubject.asObservable();

  private roomsListRefreshSubject = new BehaviorSubject<boolean>(false);
  roomsListRefresh$ = this.roomsListRefreshSubject.asObservable();

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  startConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.signalRUrl, {
        accessTokenFactory: () => this.authService.getToken() || ''
      })
      .build();

    this.hubConnection.start()
      .then(() => console.log('SignalR Connection started'))
      .catch(err => console.error('Error while starting SignalR connection: ' + err));

    this.hubConnection.on('ReceiveMessage', (message: Message) => {
      this.newMessageSubject.next(message);
    });
  }

  stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop()
        .then(() => console.log('SignalR Connection stopped'))
        .catch(err => console.error('Error while stopping SignalR connection: ' + err));
    }
  }

  joinRoomGroup(roomId: string): void {
    if (this.hubConnection) {
        this.hubConnection.invoke('JoinRoom', roomId)
            .catch(err => console.error('Error while joining room: ' + err));
    }
  }

  leaveRoomGroup(roomId: string): void {
    if (this.hubConnection) {
        this.hubConnection.invoke('LeaveRoom', roomId)
            .catch(err => console.error('Error while leaving room: ' + err));
    }
  }

  sendMessage(roomId: string, messageText: string): Observable<any> {
    const formData = new FormData();
    formData.append('RoomId', roomId);
    formData.append('MessageText', messageText);
    formData.append('MessageType', '0'); // MessageType for Text

    return this.http.post(`${this.apiUrl}/Message/SendMessage`, formData, { headers: this.getAuthHeaders() });
  }

  getUserRooms(): Observable<CustomeResponse<Room[]>> {
    return this.http.get<CustomeResponse<Room[]>>(
      `${this.apiUrl}/Room/GetAllRoomsByUserId`,
      { headers: this.getAuthHeaders() }
    );
  }

  getAllUsers(): Observable<CustomeResponse<GetAllUsersResponseData>> {
    return this.http.get<CustomeResponse<GetAllUsersResponseData>>(
      `${this.apiUrl}/AppUser/GetAllUsers`,
      { headers: this.getAuthHeaders() }
    );
  }

  getMessages(roomId: string): Observable<PaginatedMessages> {
    let params = new HttpParams().set('RoomId', roomId);
    return this.http.get<CustomeResponse<PaginatedMessages>>(`${this.apiUrl}/Message/GetAllMessagesByRoomId`, { headers: this.getAuthHeaders(), params })
      .pipe(
        map(response => response.data)
      );
  }

  createPrivateRoom(otherUserId: string): Observable<CustomeResponse<boolean>> {
    const body = { userId: otherUserId };
    return this.http.post<CustomeResponse<boolean>>(
      `${this.apiUrl}/Room/CreatePrivateRoom`,
      body,
      { headers: this.getAuthHeaders() }
    );
  }

  requestRoomsListRefresh(): void {
    this.roomsListRefreshSubject.next(true);
  }
}
