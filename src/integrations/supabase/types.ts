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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: number
          ip_hint: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: number
          ip_hint?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: number
          ip_hint?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_by: string | null
          banned_until: string | null
          created_at: string
          reason: string
          user_id: string
        }
        Insert: {
          banned_by?: string | null
          banned_until?: string | null
          created_at?: string
          reason: string
          user_id: string
        }
        Update: {
          banned_by?: string | null
          banned_until?: string | null
          created_at?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
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
          callee_id: string | null
          caller_id: string | null
          created_at: string | null
          id: string
          status: string | null
        }
        Insert: {
          callee_id?: string | null
          caller_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          callee_id?: string | null
          caller_id?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          audio_duration: number | null
          chat_id: string
          content: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
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
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
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
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
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
      chat_read_receipts: {
        Row: {
          chat_id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chats: {
        Row: {
          cleared_before: Json | null
          created_at: string
          deleted_by: string[] | null
          id: string
          last_message_at: string | null
          last_message_content: string | null
          last_message_sender_id: string | null
          last_read_at: string | null
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
          last_message_sender_id?: string | null
          last_read_at?: string | null
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
          last_message_sender_id?: string | null
          last_read_at?: string | null
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
      close_friends: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          owner_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          owner_id?: string
        }
        Relationships: []
      }
      contact_nicknames: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          nickname: string | null
          owner_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          nickname?: string | null
          owner_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          nickname?: string | null
          owner_id?: string
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
      highlight_stories: {
        Row: {
          created_at: string
          highlight_id: string
          position: number
          story_id: string
        }
        Insert: {
          created_at?: string
          highlight_id: string
          position?: number
          story_id: string
        }
        Update: {
          created_at?: string
          highlight_id?: string
          position?: number
          story_id?: string
        }
        Relationships: []
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
          receiver_id: string | null
          sender_id: string | null
          sent_by: string | null
          status: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_favorite?: boolean
          is_public?: boolean
          is_read?: boolean
          receiver_id?: string | null
          sender_id?: string | null
          sent_by?: string | null
          status?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          is_favorite?: boolean
          is_public?: boolean
          is_read?: boolean
          receiver_id?: string | null
          sender_id?: string | null
          sent_by?: string | null
          status?: string | null
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
          related_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
          type?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_id?: string | null
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
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_edited: boolean
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_edited?: boolean
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_media: {
        Row: {
          created_at: string
          duration: number | null
          height: number | null
          id: string
          position: number
          post_id: string
          type: string
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          position?: number
          post_id: string
          type: string
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          position?: number
          post_id?: string
          type?: string
          url?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          caption: string | null
          comments_count: number
          created_at: string
          hashtags: string[] | null
          id: string
          is_edited: boolean
          likes_count: number
          media_type: string
          mentions: string[] | null
          privacy: string
          saves_count: number
          updated_at: string
        }
        Insert: {
          author_id: string
          caption?: string | null
          comments_count?: number
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_edited?: boolean
          likes_count?: number
          media_type?: string
          mentions?: string[] | null
          privacy?: string
          saves_count?: number
          updated_at?: string
        }
        Update: {
          author_id?: string
          caption?: string | null
          comments_count?: number
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_edited?: boolean
          likes_count?: number
          media_type?: string
          mentions?: string[] | null
          privacy?: string
          saves_count?: number
          updated_at?: string
        }
        Relationships: []
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
          selected_theme: string
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
          selected_theme?: string
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
          selected_theme?: string
          social_links?: Json | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          is_active: boolean
          last_active_at: string | null
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean
          last_active_at?: string | null
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          count: number
          id: number
          user_id: string
          window_start: string
        }
        Insert: {
          action: string
          count?: number
          id?: number
          user_id: string
          window_start?: string
        }
        Update: {
          action?: string
          count?: number
          id?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reserved_usernames: {
        Row: {
          username: string
        }
        Insert: {
          username: string
        }
        Update: {
          username?: string
        }
        Relationships: []
      }
      saved_posts: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      spam_reports: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          reason: string
          reporter_id: string | null
          status: string
          target_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          reason: string
          reporter_id?: string | null
          status?: string
          target_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          reason?: string
          reporter_id?: string | null
          status?: string
          target_id?: string | null
        }
        Relationships: []
      }
      stories: {
        Row: {
          audio_artist: string | null
          audio_cover: string | null
          audio_start: number | null
          audio_title: string | null
          audio_url: string | null
          author_id: string
          caption: string | null
          created_at: string
          duration: number
          expires_at: string
          height: number | null
          id: string
          media_type: string
          media_url: string
          overlays: Json
          privacy: string
          views_count: number
          width: number | null
        }
        Insert: {
          audio_artist?: string | null
          audio_cover?: string | null
          audio_start?: number | null
          audio_title?: string | null
          audio_url?: string | null
          author_id: string
          caption?: string | null
          created_at?: string
          duration?: number
          expires_at?: string
          height?: number | null
          id?: string
          media_type: string
          media_url: string
          overlays?: Json
          privacy?: string
          views_count?: number
          width?: number | null
        }
        Update: {
          audio_artist?: string | null
          audio_cover?: string | null
          audio_start?: number | null
          audio_title?: string | null
          audio_url?: string | null
          author_id?: string
          caption?: string | null
          created_at?: string
          duration?: number
          expires_at?: string
          height?: number | null
          id?: string
          media_type?: string
          media_url?: string
          overlays?: Json
          privacy?: string
          views_count?: number
          width?: number | null
        }
        Relationships: []
      }
      story_highlights: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          owner_id: string
          position: number
          title: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          owner_id: string
          position?: number
          title: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          position?: number
          title?: string
        }
        Relationships: []
      }
      story_replies: {
        Row: {
          content: string
          created_at: string
          id: string
          replier_id: string
          story_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          replier_id: string
          story_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          replier_id?: string
          story_id?: string
        }
        Relationships: []
      }
      story_views: {
        Row: {
          created_at: string
          id: string
          story_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          story_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          story_id?: string
          viewer_id?: string
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
          in_app_sound_enabled: boolean | null
          language: string
          notification_preview: boolean | null
          notification_sound: string | null
          notification_volume: number | null
          push_notifications: boolean
          selected_theme: string
          show_last_seen: boolean
          show_online: boolean
          social_visibility: string
          theme: string
          updated_at: string
          user_id: string
          vibration_enabled: boolean | null
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
          in_app_sound_enabled?: boolean | null
          language?: string
          notification_preview?: boolean | null
          notification_sound?: string | null
          notification_volume?: number | null
          push_notifications?: boolean
          selected_theme?: string
          show_last_seen?: boolean
          show_online?: boolean
          social_visibility?: string
          theme?: string
          updated_at?: string
          user_id: string
          vibration_enabled?: boolean | null
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
          in_app_sound_enabled?: boolean | null
          language?: string
          notification_preview?: boolean | null
          notification_sound?: string | null
          notification_volume?: number | null
          push_notifications?: boolean
          selected_theme?: string
          show_last_seen?: boolean
          show_online?: boolean
          social_visibility?: string
          theme?: string
          updated_at?: string
          user_id?: string
          vibration_enabled?: boolean | null
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
      can_view_post: {
        Args: { _post_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_story: {
        Args: { _story_id: string; _user_id: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: { p_action: string; p_max_per_minute?: number }
        Returns: boolean
      }
      cleanup_inactive_push_subscriptions: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      cleanup_old_data: { Args: never; Returns: undefined }
      debug_auth: { Args: never; Returns: Json }
      get_chat_stats: { Args: { p_chat_id: string }; Returns: Json }
      get_or_create_chat: { Args: { p_other_user_id: string }; Returns: string }
      get_unread_counts: {
        Args: { p_user_id: string }
        Returns: {
          chat_id: string
          unread_count: number
        }[]
      }
      is_user_banned: { Args: { p_user_id?: string }; Returns: boolean }
      mark_chat_read: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_chat_read_atomic: {
        Args: { p_chat_id: string; p_user_id: string }
        Returns: {
          marked_count: number
        }[]
      }
      mark_stale_users_offline: { Args: never; Returns: undefined }
      register_push_subscription: {
        Args: {
          p_auth: string
          p_endpoint: string
          p_p256dh: string
          p_user_agent: string
        }
        Returns: undefined
      }
      report_user: {
        Args: { p_message_id?: string; p_reason: string; p_target_id: string }
        Returns: undefined
      }
      search_messages_in_chat: {
        Args: { p_chat_id: string; p_limit?: number; p_query: string }
        Returns: {
          content: string
          created_at: string
          id: string
          media_type: string
          media_url: string
          sender_id: string
        }[]
      }
      send_push_notification: {
        Args: {
          p_body: string
          p_chat_id?: string
          p_msg_id?: string
          p_sender_avatar?: string
          p_tag?: string
          p_title: string
          p_url?: string
          p_user_id: string
        }
        Returns: undefined
      }
      set_user_presence: {
        Args: { p_active_chat_id?: string; p_is_online: boolean }
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
