export type MessageStatus = "sending" | "sent" | "delivered" | "read" | "failed";

export type MessageType = "text" | "image" | "voice" | "system";

export interface ChatUser {
  id: string;
  name: string;
  avatar_url?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
}

export interface Reaction {
  emoji: string;
  user_id: string;
}

export interface ReplyTo {
  id: string;
  author_name: string;
  preview: string;
  type: MessageType;
  media_url?: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: ChatUser;
  type: MessageType;
  content?: string | null;
  media_urls?: string[] | null;          // for image messages (multi)
  voice_url?: string | null;             // for voice
  voice_duration?: number | null;        // seconds
  voice_waveform?: number[] | null;      // 0..1 samples
  reply_to?: ReplyTo | null;
  reactions?: Reaction[];
  status?: MessageStatus;
  created_at: string;                    // ISO
  edited_at?: string | null;
  deleted_at?: string | null;
}
