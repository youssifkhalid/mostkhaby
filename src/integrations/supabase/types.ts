export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_users_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_users_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          callee_id: string
          caller_id: string
          chat_id: string
          created_at: string
          duration: number | null
          ended_at: string | null
          id: string
          started_at: string
          status: string
          type: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          chat_id: string
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          type?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          chat_id?: string
          created_at?: string
          duration?: number | null
          ended_at?: string | null
          id?: string
          started_at?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          audio_duration: number | null
          chat_id: string
          content: string
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          media_type: string | null
          media_url: string | null
          reply_to_id: string | null
          sender_id: string
          status: string
          waveform: Json | null
        }
        Insert: {
          audio_duration?: number | null
          chat_id: string
          content: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          sender_id: string
          status?: string
          waveform?: Json | null
        }
        Update: {
          audio_duration?: number | null
          chat_id?: string
          content?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          media_type?: string | null
          media_url?: string | null
          reply_to_id?: string | null
          sender_id?: string
          status?: string
          waveform?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          cleared_before: Json | null
          created_at: string
          deleted_by: string[] | null
          id: string
          last_message_at: string | null
          last_message_content: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          cleared_before?: Json | null
          created_at?: string
          deleted_by?: string[] | null
          id?: string
          last_message_at?: string | null
          last_message_content?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          cleared_before?: Json | null
          created_at?: string
          deleted_by?: string[] | null
          id?: string
          last_message_at?: string | null
          last_message_content?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chats_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_nicknames: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          nickname: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          nickname: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          nickname?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          message_id: string
          replier_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_id: string
          replier_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_id?: string
          replier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_replies_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_replies_replier_id_fkey"
            columns: ["replier_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          is_favorite: boolean
          is_public: boolean
          is_read: boolean
          receiver_id: string
          sender_id: string | null
          sent_by: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_favorite?: boolean
          is_public?: boolean
          is_read?: boolean
          receiver_id: string
          sender_id?: string | null
          sent_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_favorite?: boolean
          is_public?: boolean
          is_read?: boolean
          receiver_id?: string
          sender_id?: string | null
          sent_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_visits: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          visitor_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          visitor_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_visits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_visits_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          id: string
          is_online: boolean
          last_seen: string | null
          phone_number: string | null
          social_links: Json | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id: string
          is_online?: boolean
          last_seen?: string | null
          phone_number?: string | null
          social_links?: Json | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          id?: string
          is_online?: boolean
          last_seen?: string | null
          phone_number?: string | null
          social_links?: Json | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_anonymous: boolean
          allow_follows: boolean
          allow_images: boolean
          allow_replies: boolean
          auto_block_offensive: boolean
          created_at: string
          email_notifications: boolean
          hide_from_search: boolean
          in_app_sound_enabled: boolean
          language: string
          notification_preview: boolean
          notification_sound: string
          notification_volume: number
          push_notifications: boolean
          show_last_seen: boolean
          show_online: boolean
          social_visibility: string
          theme: string
          updated_at: string
          user_id: string
          vibration_enabled: boolean
        }
        Insert: {
          allow_anonymous?: boolean
          allow_follows?: boolean
          allow_images?: boolean
          allow_replies?: boolean
          auto_block_offensive?: boolean
          created_at?: string
          email_notifications?: boolean
          hide_from_search?: boolean
          in_app_sound_enabled?: boolean
          language?: string
          notification_preview?: boolean
          notification_sound?: string
          notification_volume?: number
          push_notifications?: boolean
          show_last_seen?: boolean
          show_online?: boolean
          social_visibility?: string
          theme?: string
          updated_at?: string
          user_id: string
          vibration_enabled?: boolean
        }
        Update: {
          allow_anonymous?: boolean
          allow_follows?: boolean
          allow_images?: boolean
          allow_replies?: boolean
          auto_block_offensive?: boolean
          created_at?: string
          email_notifications?: boolean
          hide_from_search?: boolean
          in_app_sound_enabled?: boolean
          language?: string
          notification_preview?: boolean
          notification_sound?: string
          notification_volume?: number
          push_notifications?: boolean
          show_last_seen?: boolean
          show_online?: boolean
          social_visibility?: string
          theme?: string
          updated_at?: string
          user_id?: string
          vibration_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_push_notification: {
        Args: {
          p_body: string
          p_tag?: string
          p_title: string
          p_url?: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
