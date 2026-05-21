-- 1) Re-define send_push_notification to accept optional p_sender_avatar
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_tag text DEFAULT 'general',
  p_chat_id text DEFAULT NULL,
  p_msg_id text DEFAULT NULL,
  p_sender_avatar text DEFAULT NULL
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
      'msgId', p_msg_id,
      'icon_url', p_sender_avatar
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- never block the original insert/trigger
  NULL;
END;
$$;

-- 2) Re-define notify_on_new_chat_message trigger function to pass sender_avatar to send_push_notification
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
      NEW.id::text,
      sender_avatar
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Create BEFORE INSERT trigger on chat_messages to set status to 'delivered' if recipient is online
CREATE OR REPLACE FUNCTION public.set_message_initial_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_id uuid;
  v_recipient_online boolean;
BEGIN
  -- Get recipient ID
  SELECT CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END
    INTO v_recipient_id
    FROM public.chats c
    WHERE c.id = NEW.chat_id;

  IF v_recipient_id IS NOT NULL THEN
    -- Get recipient's online status
    SELECT COALESCE(is_online, false) INTO v_recipient_online
      FROM public.profiles
      WHERE id = v_recipient_id;

    -- If recipient is online, set status to 'delivered' instantly
    IF v_recipient_online THEN
      NEW.status := 'delivered';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_message_initial_status ON public.chat_messages;
CREATE TRIGGER trg_set_message_initial_status
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_message_initial_status();

-- 4) Create AFTER UPDATE trigger on follows table to notify follower and create a chat when accepted
CREATE OR REPLACE FUNCTION public.notify_on_follow_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_following_name text;
BEGIN
  -- Check if follow request status changes from 'pending' to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status = 'pending' OR OLD.status IS NULL) THEN
    SELECT COALESCE(full_name, username, 'صديق') INTO v_following_name
      FROM public.profiles WHERE id = NEW.following_id;

    -- A) Insert local notification for the follower
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (NEW.follower_id, v_following_name || ' قبل طلب المتابعة الخاص بك! 🎉', 'friend');

    -- B) Trigger push notification to the follower
    PERFORM public.send_push_notification(
      NEW.follower_id,
      'تم قبول طلب المتابعة 🎉',
      v_following_name || ' قبل طلب المتابعة الخاص بك، ابدأ الدردشة الآن!',
      '/chats',
      'follow-accept-' || NEW.id::text,
      NULL,
      NULL,
      NULL
    );

    -- C) Automatically create a chat between them if none exists
    IF NOT EXISTS (
      SELECT 1 FROM public.chats
      WHERE (user1_id = NEW.follower_id AND user2_id = NEW.following_id)
         OR (user1_id = NEW.following_id AND user2_id = NEW.follower_id)
    ) THEN
      INSERT INTO public.chats (user1_id, user2_id)
      VALUES (NEW.follower_id, NEW.following_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_follow_update ON public.follows;
CREATE TRIGGER trg_on_follow_update
  AFTER UPDATE OF status ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow_update();
