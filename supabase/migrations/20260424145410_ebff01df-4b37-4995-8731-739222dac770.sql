
-- 1) Push subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subs select" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own push subs insert" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own push subs delete" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users manage own push subs update" ON public.push_subscriptions;

DROP POLICY IF EXISTS "Users manage own push subs select" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs select" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own push subs insert" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs insert" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own push subs delete" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs delete" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users manage own push subs update" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subs update" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 2) Chat messages: edit + soft delete
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Senders can update own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Senders can update own chat messages" ON public.chat_messages;
CREATE POLICY "Senders can update own chat messages" ON public.chat_messages
  FOR UPDATE TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Senders can delete own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Senders can delete own chat messages" ON public.chat_messages;
CREATE POLICY "Senders can delete own chat messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- 3) Allow system (security definer triggers) to insert notifications
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated, anon WITH CHECK (true);

-- 4) Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 5) Helper to call send-push edge function
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_tag text DEFAULT 'general'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
BEGIN
  v_url := 'https://ydpeqyydxnnxiwofarmr.supabase.co/functions/v1/send-push';
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'tag', p_tag
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- never block the original insert
  NULL;
END;
$$;

-- 6) Push triggers (replace existing notify triggers to also send push)
CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, content, type)
  VALUES (NEW.receiver_id, 'وصلتك رسالة جديدة من مجهول! 🤫', 'message');
  PERFORM public.send_push_notification(
    NEW.receiver_id,
    'رسالة جديدة 🤫',
    'وصلتك رسالة مجهولة جديدة — افتح التطبيق لقراءتها',
    '/inbox',
    'msg-' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  recipient_id uuid;
  sender_name text;
BEGIN
  SELECT CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END
    INTO recipient_id FROM public.chats c WHERE c.id = NEW.chat_id;
  SELECT COALESCE(full_name, username, 'صديق') INTO sender_name
    FROM public.profiles WHERE id = NEW.sender_id;

  IF recipient_id IS NOT NULL AND recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (recipient_id, 'رسالة جديدة في الشات 💬', 'message');
    PERFORM public.send_push_notification(
      recipient_id,
      sender_name,
      LEFT(NEW.content, 200),
      '/chat/' || NEW.chat_id::text,
      'chat-' || NEW.chat_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  original_sender_id uuid;
BEGIN
  SELECT COALESCE(sent_by, sender_id) INTO original_sender_id
    FROM public.messages WHERE id = NEW.message_id;
  IF original_sender_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (original_sender_id, 'حد رد على رسالتك! 💬', 'reply');
    PERFORM public.send_push_notification(
      original_sender_id,
      'رد جديد 💬',
      LEFT(NEW.content, 200),
      '/inbox',
      'reply-' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  follower_name text;
BEGIN
  SELECT COALESCE(full_name, username, 'حد') INTO follower_name
    FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, content, type)
  VALUES (NEW.following_id, 'حد عايز يتابعك! 👀', 'follow');
  PERFORM public.send_push_notification(
    NEW.following_id,
    'طلب متابعة جديد 👀',
    follower_name || ' عايز يتابعك',
    '/notifications',
    'follow-' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

-- Recreate triggers (idempotent)
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

DROP TRIGGER IF EXISTS on_new_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_new_chat_message_notify AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat_message();

DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
CREATE TRIGGER on_reply_notify AFTER INSERT ON public.message_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

-- Ensure update trigger for chat last message exists
DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
CREATE TRIGGER on_chat_message_update_chat AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message();

-- Ensure realtime
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_reactions REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;