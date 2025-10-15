// Generic API response structure
export interface ApiResponse<T> {
  data: T;
  message: string | null;
  internalMessage: string | null;
  status: number;
}

// Models for Room data
export interface Room {
  roomId: string;
  roomName: string | null;
  imagePath: string | null;
  roomType: number;
  lastMessageAt: string;
}

// Models for User data
export interface User {
  id: string;
  name: string;
  imagePath: string;
  isOnline: boolean;
}

export interface PaginatedUsers {
  items: User[] | null; // Based on your JSON, this seems to be 'data' instead
  data: User[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Models for Message data
export interface FileMessage {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
}

export interface Message {
  id: string;
  roomId?: string;
  userId: string;
  userName: string;
  userProfileImage: string;
  messageText: string;
  messageType: number;
  isEdited: boolean;
  createdAt: string;
  fileMessage: FileMessage | null;
  voiceMessage: any | null; // Define a proper interface if you have one
  displayContent: string;
  status?: 'sending' | 'sent' | 'failed'; 
}

export interface MessageHistory {
  messages: Message[];
  totalCount: number;
  hasMore: boolean;
}

// Update this interface to match the new response
export interface CreateRoomResponse {
  roomId: string;
  memberName: string; // This is the other user's ID
  lastUpdated: string;
}
