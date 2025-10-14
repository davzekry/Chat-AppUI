// src/app/interfaces/chat.interfaces.ts

// Response wrapper for all API calls
export interface CustomeResponse<T> {
  data: T;
  message: string | null;
  internalMessage: string | null;
  status: number;
}

// Room interface based on GetAllRoomsByUserId response
export interface Room {
  roomId: string;
  roomName: string | null; // Can be null for private chats
  imagePath: string | null; // Can be null for private chats
  roomType: 0 | 1; // 0: Private, 1: Group
  lastMessageAt?: string; // Date string
  // Backend needs to provide other participant's info for private chats here.
  // For now, we'll try to infer or use placeholders.
  otherParticipant?: { // Assuming backend might add this eventually
    userId: string;
    userName: string;
    userImage: string;
  };
}

// User interface based on GetAllUsers response (from 'data' array)
export interface User {
  id: string;
  name: string;
  imagePath?: string;
  isOnline: boolean;
}

// FileMessage and VoiceMessage nested interfaces
export interface FileMessage {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}

export interface VoiceMessage {
  id: string;
  userId: string;
  audioFilePath: string;
  durationSeconds: number;
}

// Message interface based on GetAllMessagesByRoomId and SignalR ReceiveMessage
export interface Message {
  id: string; // Message ID
  roomId: string;
  userId: string; // Sender's ID
  userName: string; // Sender's name
  userProfileImage?: string; // Sender's image
  messageText: string;
  messageType: 0 | 1 | 2; // 0: Text, 1: File, 2: Audio
  isEdited: boolean;
  createdAt: string; // Date string
  fileMessage?: FileMessage;
  voiceMessage?: VoiceMessage;
  displayContent: string;
}

// --- Specific Response Structures ---

// GetAllUsers API response structure
export interface GetAllUsersResponseData {
  items: User[] | null; // This appears to be null based on your example
  data: User[];       // This is where your actual user array is
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  count: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// GetAllMessagesByRoomId API response structure
export interface GetAllMessagesByRoomIdResponseData {
  messages: Message[]; // Array of Message objects as per your backend response
  totalCount: number;
  hasMore: boolean;
}