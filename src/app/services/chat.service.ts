// src/app/services/chat.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http'; // Import HttpParams
import { Observable, BehaviorSubject, from, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import * as signalR from '@microsoft/signalr';
import { Room, User } from '../components/home/home.component'; // Import updated interfaces

// Define interfaces for your backend responses
interface CustomeResponse<T> {
  data: T;
  message: string | null;
  internalMessage: string | null;
  status: number;
}

// Interface for the GetAllUsers response (paginated)
interface GetAllUsersResponseData {
  items: User[] | null; // This was null in your example, but typically holds data
  data: User[];       // This is where your actual user array is
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  count: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Interface for the GetAllMessagesByRoomId response
interface GetAllMessagesResponseData {
  messages: Message[]; // Array of Message objects
  totalCount: number;
  hasMore: boolean;
}

// UPDATED: Message Interface to match your backend's SignalR broadcast and GetMessages response
export interface Message {
  id: string; // Changed from 'id' to 'MessageId' in SignalR, but 'id' in GetMessages, using 'id'
  roomId: string; // Changed from 'roomId' to 'RoomId' in SignalR
  userId: string; // Sender ID, was 'senderId'
  userName: string; // Sender's name, was 'senderUserName'
  userProfileImage?: string; // Sender's image, was 'senderUserImage'
  messageText: string; // Message content, was 'content'
  messageType: number; // 0 for Text, 1 for File, 2 for Audio
  fileMessage?: { // Added for file messages
    id: string;
    fileName: string;
    filePath: string;
    fileSize: number;
  };
  voiceMessage?: { // Added for voice messages
    id: string;
    userId: string;
    audioFilePath: string;
    durationSeconds: number;
  };
  displayContent: string; // Useful field for what to actually display
  createdAt: Date | string; // Changed from 'timestamp' to 'createdAt'
}

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

  // --- SignalR Methods ---
  startConnection(): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      console.log('SignalR connection already active.');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('Cannot start SignalR connection: No JWT token found.');
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.signalRUrl, {
        accessTokenFactory: () => token,
        // skipNegotiation: true, // Only if you're sure you only want websockets
        // transport: signalR.HttpTransportType.WebSockets // Only if you're sure
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR connection started!');
        this.registerSignalRHandlers();
      })
      .catch((err) =>
        console.error('Error while starting SignalR connection: ' + err)
      );
  }

  private registerSignalRHandlers(): void {
    if (!this.hubConnection) return;

    // The backend `SendMessageToRoom` broadcasts an anonymous object.
    // We need to map it to our `Message` interface here.
    this.hubConnection.on('ReceiveMessage', (rawMessage: any) => {
      console.log('Received raw message from SignalR:', rawMessage);
      const mappedMessage: Message = {
        id: rawMessage.messageId || rawMessage.Id, // Handle potential casing differences
        roomId: rawMessage.roomId || rawMessage.RoomId,
        userId: rawMessage.userId || rawMessage.UserId,
        userName: rawMessage.userName || rawMessage.UserName || 'Unknown', // Add a default for safety
        userProfileImage: rawMessage.userProfileImage || rawMessage.UserProfileImage || '',
        messageText: rawMessage.messageText || rawMessage.MessageText || '',
        messageType: rawMessage.messageType || rawMessage.MessageType || 0, // Default to text
        fileMessage: rawMessage.fileMessage,
        voiceMessage: rawMessage.voiceMessage,
        displayContent: rawMessage.displayContent || rawMessage.MessageText, // Prefer displayContent
        createdAt: new Date(rawMessage.createdAt || rawMessage.CreatedAt),
      };
      this.newMessagesSubject.next(mappedMessage);
    });

    this.hubConnection.on('UserJoined', (message: string) => {
      console.log('UserJoined:', message);
      // Potentially show a toast notification or update UI
    });

    this.hubConnection.on('UserLeft', (message: string) => {
      console.log('UserLeft:', message);
      // Potentially show a toast notification or update UI
    });
  }

  stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop().then(() => console.log('SignalR connection stopped.'));
    }
  }

  // Angular client's `sendMessage` should invoke the server-side `SendMessageToRoom` directly
  // NOTE: Your backend `SendMessageToRoom` hub method takes an `object message` and tries to extract `RoomId` from it.
  // It doesn't directly take `roomId` and `messageContent` as separate arguments.
  // So, we need to send a similar object as the backend handler expects.
  sendMessage(roomId: string, messageContent: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      // Create the payload structure that your backend SendMessageCommand expects
      // The UserId will be implicitly added by your backend command handler context.
      const messagePayload = {
        RoomId: roomId,
        MessageText: messageContent,
        MessageType: 0, // Assuming 0 for Text message
        // File and AudioFile are IFormFile, not directly sent via SignalR in this manner.
        // For files, you'd typically upload via HTTP API first, then send a SignalR message with file path.
      };
      // Invoking the server-side `SendMessageToRoom` method of your hub
      return this.hubConnection.invoke('SendMessageToRoom', messagePayload)
        .catch(err => console.error('Error sending message:', err));
    } else {
      console.warn('SignalR connection not established. Message not sent.');
      return Promise.reject('SignalR not connected');
    }
  }

  // --- API Methods ---

  // UPDATED: Endpoint and response structure
  getUserRooms(): Observable<CustomeResponse<Room[]>> {
    return this.http.get<CustomeResponse<Room[]>>(
      `${this.apiUrl}/Room/GetAllRoomsByUserId`,
      { headers: this.getAuthHeaders() }
    );
  }

  // UPDATED: Endpoint and response structure
  getAllUsers(): Observable<CustomeResponse<GetAllUsersResponseData>> {
    return this.http.get<CustomeResponse<GetAllUsersResponseData>>(
      `${this.apiUrl}/AppUser/GetAllUsers`,
      { headers: this.getAuthHeaders() }
    );
  }

  // UPDATED: Endpoint and response structure
  getRoomMessages(roomId: string): Observable<CustomeResponse<GetAllMessagesResponseData>> {
    const params = new HttpParams().set('RoomId', roomId);
    return this.http.get<CustomeResponse<GetAllMessagesResponseData>>(
      `${this.apiUrl}/Message/GetAllMessagesByRoomId`,
      { headers: this.getAuthHeaders(), params }
    );
  }

  // UPDATED: Endpoint and response structure (returns boolean, not Room object)
  createPrivateRoom(otherUserId: string): Observable<CustomeResponse<boolean>> {
    const body = { userId: otherUserId }; // Backend expects 'userId' for the other party
    return this.http.post<CustomeResponse<boolean>>(
      `${this.apiUrl}/Room/CreatePrivateRoom`,
      body,
      { headers: this.getAuthHeaders() }
    ).pipe(
      // Crucial: After creating a room, we need to refresh the rooms list
      tap((response) => {
        if (response.status === 200 && response.data === true) {
          this.roomsListRefreshSubject.next(true); // Signal to refresh rooms list
        }
      })
    );
  }

  // Method to signal that the rooms list should refresh (used by RoomsListComponent)
  requestRoomsListRefresh(): void {
    this.roomsListRefreshSubject.next(false); // Reset the subject after refreshing
  }

  // New: Method to join a SignalR group for a room
  joinRoomGroup(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('JoinRoom', roomId)
        .catch(err => console.error('Error joining SignalR room group:', err));
    }
    return Promise.reject('SignalR not connected');
  }

  // New: Method to leave a SignalR group for a room
  leaveRoomGroup(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return this.hubConnection.invoke('LeaveRoom', roomId)
        .catch(err => console.error('Error leaving SignalR room group:', err));
    }
    return Promise.reject('SignalR not connected');
  }
}