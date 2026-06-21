export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  timestamp: string;
}

export interface AIChatSession {
  id: string;
  title: string;
  number: number; // Permanent sequence number #1, #2, #3, never changing
  messages: AIChatMessage[];
}

export interface User {
  username: string;
  displayName: string;
  avatarUrl?: string;
}
