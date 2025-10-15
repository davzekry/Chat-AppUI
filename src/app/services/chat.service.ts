import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  Room,
  PaginatedUsers,
  MessageHistory,
  CreateRoomResponse,
} from '../models/chat.models';

@Injectable({
  providedIn: 'root',
} )
export class ChatService {
  private readonly baseUrl = 'https://dchatapp.runasp.net/api';

  constructor(private http: HttpClient ) {}

  // Helper to get authorization headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token'); // Assuming you store the token here
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // 1. Get all rooms for the current user
  getRooms(): Observable<Room[]> {
    return this.http
      .get<ApiResponse<Room[]>>(`${this.baseUrl}/Room/GetAllRoomsByUserId`, {
        headers: this.getAuthHeaders( ),
      })
      .pipe(
        // Use the map operator to transform the data
        map(response => {
          // response.data is the array of rooms
          return response.data.map(room => {
            // Check if it's a private room and has a member
            if (room.roomType === 0 && room.members && room.members.length > 0) {
              const otherMember = room.members[0];
              // Return a new room object with the details overridden
              return {
                ...room, // Copy all original properties
                roomName: otherMember.name, // Override roomName
                imagePath: otherMember.imagePath, // Override imagePath
              };
            }
            // If it's a group chat or something else, return it as is
            return room;
          });
        })
      );
  }

  // 2. Get all registered users
  getUsers(pageNumber: number = 1, pageSize: number = 10): Observable<PaginatedUsers> {
    const params = new HttpParams()
      .set('pageNumber', pageNumber.toString())
      .set('pageSize', pageSize.toString());

    return this.http
      .get<ApiResponse<PaginatedUsers>>(`${this.baseUrl}/AppUser/GetAllUsers`, {
        headers: this.getAuthHeaders( ),
        params,
      })
      .pipe(map((response) => response.data));
  }

  // 3. Get message history for a room
  getMessages(roomId: string): Observable<MessageHistory> {
    const params = new HttpParams().set('RoomId', roomId);
    return this.http
      .get<ApiResponse<MessageHistory>>(`${this.baseUrl}/Message/GetAllMessagesByRoomId`, {
        headers: this.getAuthHeaders( ),
        params,
      })
      .pipe(map((response) => response.data));
  }

  // 4. Send a message
  sendMessage(
    roomId: string,
    messageText: string,
    messageType: number = 0,
    file?: File,
    audioFile?: File
  ): Observable<boolean> {
    const params = new HttpParams()
      .set('RoomId', roomId)
      .set('MessageText', messageText)
      .set('MessageType', messageType.toString());

    const formData = new FormData();
    if (file) {
      formData.append('File', file, file.name);
    }
    if (audioFile) {
      formData.append('AudioFile', audioFile, audioFile.name);
    }

    // For multipart/form-data, we let the browser set the Content-Type header
    const headers = this.getAuthHeaders();

    return this.http
      .post<ApiResponse<boolean>>(`${this.baseUrl}/Message/SendMessage`, formData, {
        headers: headers,
        params: params,
      } )
      .pipe(map((response) => response.data));
  }

  // 5. Create a new private room
  createPrivateRoom(userId: string): Observable<CreateRoomResponse> {
    const body = { userId };
    return this.http
      .post<ApiResponse<CreateRoomResponse>>(`${this.baseUrl}/Room/CreatePrivateRoom`, body, {
        headers: this.getAuthHeaders( ),
      })
      .pipe(map((response) => response.data)); // Extract the CreateRoomResponse object
  }
}
