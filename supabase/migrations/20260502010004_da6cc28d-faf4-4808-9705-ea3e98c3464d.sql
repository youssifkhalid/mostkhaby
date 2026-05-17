-- Recreate notify_on_new_chat_message: only insert ONE notification row.
-- The realtime listener on notifications table will trigger sound, so we don't need separate sound triggers.
CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id uuid;
  sender_name text;
  sender_avatar text;
  display_name text;
  preview_text text;
  recipient_settings record;
BEGIN
  SELECT CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END
    INTO recipient_id FROM public.chats c WHERE c.id = NEW.chat_id;

  IF recipient_id IS NULL OR recipient_id = NEW.sender_id THEN RETURN NEW; END IF;

  SELECT COALESCE(full_name, username, 'صديق'), avatar_url INTO sender_name, sender_avatar
    FROM public.profiles WHERE id = NEW.sender_id;

  SELECT nickname INTO display_name
    FROM public.contact_nicknames
    WHERE owner_id = recipient_id AND contact_id = NEW.sender_id;
  IF display_name IS NULL THEN display_name := sender_name; END IF;

  IF NEW.media_type = 'image' THEN
    preview_text := '📷 صورة';
  ELSIF NEW.media_type = 'audio' THEN
    preview_text := '🎤 رسالة صوتية';
  ELSE
    preview_text := LEFT(COALESCE(NEW.content, ''), 200);
  END IF;

  SELECT notification_preview, push_notifications INTO recipient_settings
    FROM public.user_settings WHERE user_id = recipient_id;

  IF COALESCE(recipient_settings.push_notifications, true) THEN
    -- Single push notification (no duplicate notifications row)
    PERFORM net.http_post(
      url := 'https://ydpeqyydxnnxiwofarmr.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object('Content-Type','application/json'),
      body := jsonb_build_object(
        'user_id', recipient_id,
        'title', display_name,
        'body', CASE WHEN COALESCE(recipient_settings.notification_preview, true) THEN preview_text ELSE 'رسالة جديدة 🔔' END,
        'url', '/chat/' || NEW.chat_id::text,
        'tag', 'chat-' || NEW.chat_id::text,
        'icon', sender_avatar,
        'badge', '/logo-icon.png',
        'msgId', NEW.id::text,
        'chatId', NEW.chat_id::text
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists ONCE (drop duplicates if any)
DROP TRIGGER IF EXISTS trg_notify_on_new_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_on_new_chat_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat_message();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_created ON public.chat_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_users ON public.chats(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON public.profiles(is_online, last_seen);

-- Ensure realtime publication includes critical tables
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Set REPLICA IDENTITY FULL for tables that need full row in updates
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;