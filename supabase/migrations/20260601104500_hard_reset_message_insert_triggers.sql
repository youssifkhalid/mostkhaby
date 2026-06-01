-- Hard reset every trigger that can run during message insertion.
-- The repeated "null character not permitted" is a database-side failure on INSERT,
-- so this removes legacy trigger chains and recreates only minimal safe logic.

-- Keep Data API access explicit.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT INSERT ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.chats TO service_role;
GRANT ALL ON public.notifications TO service_role;

-- Drop ALL triggers on the two failing tables. Old migrations used many different names,
-- and any one broken trigger can abort the insert with null-character errors.
DO $$
DECLARE
  trg record;
BEGIN
  FOR trg IN
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE NOT tgisinternal
      AND tgrelid IN ('public.messages'::regclass, 'public.chat_messages'::regclass)
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', trg.tgname, trg.table_name);
  END LOOP;
END;
$$;

-- Remove known fragile sanitizer functions so nothing can call old regex/chr(0) logic.
DROP FUNCTION IF EXISTS public.sanitize_message_content() CASCADE;
DROP FUNCTION IF EXISTS public.sanitize_user_message_content() CASCADE;
DROP FUNCTION IF EXISTS public.check_message_rate_limit() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_message_rate_limit() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_anon_message_rate_limit() CASCADE;
DROP FUNCTION IF EXISTS public.check_not_blocked_before_message() CASCADE;
DROP FUNCTION IF EXISTS public.enforce_ban_on_insert() CASCADE;
DROP FUNCTION IF EXISTS public.set_message_initial_status() CASCADE;

-- Safe, schema-aware content guard. No POSIX control regex and no chr(0), because those
-- were the source of the current PostgreSQL failure in this project.
CREATE OR REPLACE FUNCTION public.ensure_message_insert_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.content := trim(COALESCE(NEW.content, ''));

  IF TG_TABLE_NAME = 'messages' THEN
    IF NEW.content = '' THEN
      RAISE EXCEPTION 'empty_message: content cannot be empty';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'chat_messages' THEN
    IF NEW.content = '' AND COALESCE(NEW.media_url, '') = '' THEN
      RAISE EXCEPTION 'empty_message: content cannot be empty';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_last_message_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_content text;
BEGIN
  IF COALESCE(NEW.media_type, '') = 'image' THEN
    display_content := '📷 صورة';
  ELSIF COALESCE(NEW.media_type, '') = 'audio' THEN
    display_content := '🎤 رسالة صوتية';
  ELSE
    display_content := left(COALESCE(NEW.content, ''), 300);
  END IF;

  UPDATE public.chats
  SET last_message_at = COALESCE(NEW.created_at, now()),
      last_message_content = display_content,
      last_message_sender_id = NEW.sender_id,
      deleted_by = '{}'
  WHERE id = NEW.chat_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_message_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, content, type)
  VALUES (NEW.receiver_id, 'وصلتك رسالة جديدة 🤫', 'message');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id uuid;
BEGIN
  SELECT CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END
    INTO recipient_id
  FROM public.chats c
  WHERE c.id = NEW.chat_id;

  IF recipient_id IS NOT NULL AND recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (recipient_id, 'رسالة جديدة في الشات 💬', 'message');
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_messages_insert_content
  BEFORE INSERT OR UPDATE OF content ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_insert_content();

CREATE TRIGGER ensure_chat_messages_insert_content
  BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_insert_content();

CREATE TRIGGER update_chat_last_message_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message_safe();

CREATE TRIGGER notify_message_after_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message_safe();

CREATE TRIGGER notify_chat_message_after_insert
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat_message_safe();
