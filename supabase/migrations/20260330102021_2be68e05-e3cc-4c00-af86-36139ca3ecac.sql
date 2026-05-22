DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_replies'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_replies;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chats'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_messages'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'follows'
  ) THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.notify_on_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  original_sender_id uuid;
BEGIN
  SELECT COALESCE(sent_by, sender_id)
  INTO original_sender_id
  FROM public.messages
  WHERE id = NEW.message_id;

  IF original_sender_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (original_sender_id, 'حد رد على رسالتك! 💬', 'reply');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recipient_id uuid;
BEGIN
  SELECT CASE
    WHEN c.user1_id = NEW.sender_id THEN c.user2_id
    ELSE c.user1_id
  END
  INTO recipient_id
  FROM public.chats c
  WHERE c.id = NEW.chat_id;

  IF recipient_id IS NOT NULL AND recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (recipient_id, 'رسالة جديدة في الشات 💬', 'message');
  END IF;

  RETURN NEW;
END;
$function$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'on_chat_message_notify'
  ) THEN
    DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_chat_message_notify
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_new_chat_message();
  END IF;
END
$$;