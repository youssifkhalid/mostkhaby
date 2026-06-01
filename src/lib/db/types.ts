// Database types for offline-first architecture

export interface Message {
  id: string;
  chatId: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'pending';
  media: MediaItem[];
  replyTo?: ReplyPreview;
  reactions: Reaction[];
  isLocalOnly: boolean;
  syncedAt?: number;
  deletedAt?: number;
}

export interface MediaItem {
  id: string;
  messageId: string;
  type: 'image' | 'voice' | 'file';
  dataUrl?: string;
  localPath: string;
  remoteUrl?: string;
  size: number;
  duration?: number;
  waveform?: number[];
  synced: boolean;
}

export interface ReplyPreview {
  id: string;
  authorName: string;
  preview: string;
  type: 'text' | 'image' | 'voice' | 'file';
  mediaUrl?: string;
}

export interface Reaction {
  emoji: string;
  userId: string;
  timestamp: number;
}

export interface Chat {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  syncedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number;
}

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface SyncQueueItem {
  id?: number;
  action: 'send' | 'update' | 'delete' | 'react' | 'edit';
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'failed' | 'synced';
  error?: string;
  nextRetryTime?: number;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: number;
  syncError?: string;
}

export interface Draft {
  chatId: string;
  text: string;
  media: MediaItem[];
  replyTo?: ReplyPreview;
  timestamp: number;
}
