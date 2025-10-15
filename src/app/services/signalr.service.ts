import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { Message } from '../models/chat.models'; // Assuming Message model is in this path

@Injectable({
  providedIn: 'root',
} )
export class SignalrService {
  private hubConnection!: HubConnection;
  // Use a Subject to broadcast received messages to any component that subscribes
  public messageReceived$ = new Subject<Message>();

  constructor() {}

  public startConnection(): void {
    const token = localStorage.getItem('jwt_token'); // Get the auth token
    if (!token) {
      console.error('Auth token not found. Cannot start SignalR connection.');
      return;
    }

    this.hubConnection = new HubConnectionBuilder()
      .withUrl('https://dchatapp.runasp.net/chatHub', {
        // Pass the token for authentication
        accessTokenFactory: ( ) => token,
      })
      .withAutomaticReconnect() // Automatically try to reconnect if the connection is lost
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('SignalR connection started successfully.');
        this.addReceiveMessageListener();
      })
      .catch((err) =>
        console.error('Error while starting SignalR connection: ' + err)
      );
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection
        .stop()
        .then(() => console.log('SignalR connection stopped.'))
        .catch((err) =>
          console.error('Error while stopping SignalR connection: ' + err)
        );
    }
  }

  // Listen for the "ReceiveMessage" event from the server
  private addReceiveMessageListener(): void {
    this.hubConnection.on('ReceiveMessage', (message: Message) => {
      console.log('Message received from SignalR:', message);
      // When a message is received, push it to our Subject
      this.messageReceived$.next(message);
    });
  }
  
  // You can also add methods to invoke hub methods on the server, e.g., joining a room
  public joinRoom(roomId: string): void {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinRoom', roomId)
        .catch(err => console.error('Error joining room: ', err));
    }
  }
}
