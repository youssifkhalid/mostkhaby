
-- 1. Contact nicknames table (private to each user)
CREATE TABLE IF NOT EXISTS public.contact_nicknames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  nickname text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id, contact_id)
);

ALTER TABLE public.contact_nicknames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own nicknames" ON public.contact_nicknames
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users insert own nicknames" ON public.contact_nicknames
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users update own nicknames" ON public.contact_nicknames
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users delete own nicknames" ON public.contact_nicknames
  FOR DELETE USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_contact_nicknames_owner ON public.contact_nicknames(owner_id);

CREATE TRIGGER update_contact_nicknames_updated_at
  BEFORE UPDATE ON public.contact_nicknames
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Notification preferences in user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notification_sound text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS notification_volume integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS vibration_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_preview boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_sound_enabled boolean NOT NULL DEFAULT true;

-- 3. Enhanced chat message notification (uses nickname if exists, sends sender avatar)
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

  -- Use nickname if recipient set one
  SELECT nickname INTO display_name
    FROM public.contact_nicknames
    WHERE owner_id = recipient_id AND contact_id = NEW.sender_id;
  IF display_name IS NULL THEN display_name := sender_name; END IF;

  -- Build preview based on media_type
  IF NEW.media_type = 'image' THEN
    preview_text := '📷 صورة';
  ELSIF NEW.media_type = 'audio' THEN
    preview_text := '🎤 رسالة صوتية';
  ELSE
    preview_text := LEFT(COALESCE(NEW.content, ''), 200);
  END IF;

  -- Check if recipient wants previews
  SELECT notification_preview, push_notifications INTO recipient_settings
    FROM public.user_settings WHERE user_id = recipient_id;

  IF recipient_settings.push_notifications IS DISTINCT FROM false THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (recipient_id, display_name || ': ' || preview_text, 'message');

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
