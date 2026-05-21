-- 1) Re-define send_push_notification to accept optional p_chat_id and p_msg_id
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_tag text DEFAULT 'general',
  p_chat_id text DEFAULT NULL,
  p_msg_id text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
BEGIN
  v_url := 'https://nckqldzfhxigguagerei.supabase.co/functions/v1/send-push';
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'tag', p_tag,
      'chatId', p_chat_id,
      'msgId', p_msg_id
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- never block the original insert/trigger
  NULL;
END;
$$;

-- 2) Re-define notify_on_new_chat_message trigger function
--    to ONLY send the push notification and OMIT the in-app notifications INSERT.
CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
  sender_avatar text;
  display_name text;
  preview_text text;
  recipient_settings record;
BEGIN
  -- Get the recipient ID from the chat
  SELECT CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END
    INTO recipient_id FROM public.chats c WHERE c.id = NEW.chat_id;

  IF recipient_id IS NULL OR recipient_id = NEW.sender_id THEN 
    RETURN NEW; 
  END IF;

  -- Get the sender profile information
  SELECT COALESCE(full_name, username, 'صديق'), avatar_url INTO sender_name, sender_avatar
    FROM public.profiles WHERE id = NEW.sender_id;

  -- Check if there is a nickname configured
  SELECT nickname INTO display_name
    FROM public.contact_nicknames
    WHERE owner_id = recipient_id AND contact_id = NEW.sender_id;
  IF display_name IS NULL THEN 
    display_name := sender_name; 
  END IF;

  -- Format preview text
  IF NEW.media_type = 'image' THEN
    preview_text := '📷 صورة';
  ELSIF NEW.media_type = 'audio' THEN
    preview_text := '🎤 رسالة صوتية';
  ELSE
    preview_text := LEFT(COALESCE(NEW.content, ''), 200);
  END IF;

  -- Get recipient's push settings
  SELECT push_notifications, notification_preview INTO recipient_settings
    FROM public.user_settings WHERE user_id = recipient_id;

  IF COALESCE(recipient_settings.push_notifications, true) THEN
    -- Trigger background push via Edge Function
    PERFORM public.send_push_notification(
      recipient_id,
      display_name,
      CASE WHEN COALESCE(recipient_settings.notification_preview, true) THEN preview_text ELSE 'رسالة جديدة 🔔' END,
      '/chat/' || NEW.chat_id::text,
      'chat-' || NEW.chat_id::text,
      NEW.chat_id::text,
      NEW.id::text
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- 3) Drop and recreate RLS policies for the follows table to prevent 403 Forbidden errors
DROP POLICY IF EXISTS "Users can see their own follows" ON public.follows;
DROP POLICY IF EXISTS "Authenticated can follow" ON public.follows;
DROP POLICY IF EXISTS "Users can update follow status" ON public.follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
DROP POLICY IF EXISTS "Followers can cancel pending follow" ON public.follows;
DROP POLICY IF EXISTS "see_own_follows" ON public.follows;
DROP POLICY IF EXISTS "insert_own_follow" ON public.follows;
DROP POLICY IF EXISTS "update_follows" ON public.follows;
DROP POLICY IF EXISTS "delete_follows" ON public.follows;

-- Recreate robust policies allowing both parties of a follow relationship to safely view, update, or delete it.
CREATE POLICY "see_own_follows" ON public.follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "insert_own_follow" ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "update_follows" ON public.follows FOR UPDATE TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id)
  WITH CHECK (auth.uid() = follower_id OR auth.uid() = following_id);

CREATE POLICY "delete_follows" ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- 4) Re-define mark_chat_read to also update chat_messages table statuses to 'read'
CREATE OR REPLACE FUNCTION public.mark_chat_read(
  p_chat_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is a chat participant
  IF NOT EXISTS (
    SELECT 1 FROM public.chats
    WHERE id = p_chat_id
      AND (user1_id = p_user_id OR user2_id = p_user_id)
  ) THEN
    RETURN;
  END IF;

  -- Update last_read_at receipt
  INSERT INTO public.chat_read_receipts (chat_id, user_id, last_read_at)
  VALUES (p_chat_id, p_user_id, now())
  ON CONFLICT (chat_id, user_id)
  DO UPDATE SET last_read_at = EXCLUDED.last_read_at;

  -- Mark all messages sent by the other user in this chat as read
  UPDATE public.chat_messages
  SET status = 'read'
  WHERE chat_id = p_chat_id
    AND sender_id != p_user_id
    AND status != 'read';
END;
$$;
