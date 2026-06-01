-- Make all BEFORE INSERT message guards schema-safe and non-fragile.
-- Important: never reference chat_messages-only columns while the trigger runs on messages.

CREATE OR REPLACE FUNCTION public.ensure_message_content_not_empty()
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
    IF NEW.content = '' AND NEW.media_url IS NULL THEN
      RAISE EXCEPTION 'empty_message: content cannot be empty';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.check_rate_limit('send_message', 60) THEN
    RAISE EXCEPTION 'rate_limit_exceeded: max 60 messages per minute';
  END IF;
  RETURN NEW;
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_anon_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.check_rate_limit('send_anon_message', 60) THEN
    RAISE EXCEPTION 'rate_limit_exceeded';
  END IF;
  RETURN NEW;
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_not_blocked_before_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender uuid := COALESCE(NEW.sender_id, auth.uid());
  v_other_user uuid;
BEGIN
  IF v_sender IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT CASE WHEN c.user1_id = v_sender THEN c.user2_id ELSE c.user1_id END
    INTO v_other_user
  FROM public.chats c
  WHERE c.id = NEW.chat_id;

  IF v_other_user IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = v_other_user AND blocked_id = v_sender)
       OR (blocker_id = v_sender AND blocked_id = v_other_user)
  ) THEN
    RAISE EXCEPTION 'user_blocked: cannot send message';
  END IF;

  RETURN NEW;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_ban_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  IF TG_TABLE_NAME = 'chat_messages' THEN
    v_user := COALESCE(NEW.sender_id, auth.uid());
  ELSIF TG_TABLE_NAME = 'messages' THEN
    v_user := COALESCE(NEW.sent_by, NEW.sender_id, auth.uid());
  ELSE
    v_user := auth.uid();
  END IF;

  IF v_user IS NOT NULL AND public.is_user_banned(v_user) THEN
    RAISE EXCEPTION 'account_banned: your account has been suspended';
  END IF;
  RETURN NEW;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_chat_message_content_not_empty ON public.chat_messages;
DROP TRIGGER IF EXISTS ensure_anon_message_content_not_empty ON public.messages;
DROP TRIGGER IF EXISTS enforce_chat_message_rate_limit ON public.chat_messages;
DROP TRIGGER IF EXISTS enforce_anon_message_rate_on_messages ON public.messages;
DROP TRIGGER IF EXISTS check_blocked_before_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS enforce_ban_chat_messages ON public.chat_messages;
DROP TRIGGER IF EXISTS enforce_ban_anon_messages ON public.messages;

CREATE TRIGGER ensure_chat_message_content_not_empty
  BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_content_not_empty();

CREATE TRIGGER ensure_anon_message_content_not_empty
  BEFORE INSERT OR UPDATE OF content ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_content_not_empty();

CREATE TRIGGER enforce_chat_message_rate_limit
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();

CREATE TRIGGER enforce_anon_message_rate_on_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anon_message_rate_limit();

CREATE TRIGGER check_blocked_before_chat_message
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_not_blocked_before_message();

CREATE TRIGGER enforce_ban_chat_messages
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_insert();

CREATE TRIGGER enforce_ban_anon_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_insert();
