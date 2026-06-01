-- Emergency fix: remove database-side message sanitizer triggers completely.
-- The frontend already strips unsafe characters before insert; the DB sanitizer
-- was still raising "null character not permitted" and blocking all sends.

DROP TRIGGER IF EXISTS sanitize_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS sanitize_anon_message ON public.messages;

DROP FUNCTION IF EXISTS public.sanitize_message_content();
DROP FUNCTION IF EXISTS public.sanitize_user_message_content();

CREATE OR REPLACE FUNCTION public.ensure_message_content_not_empty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.content := trim(COALESCE(NEW.content, ''));

  IF NEW.content = '' AND (
    TG_TABLE_NAME = 'messages'
    OR (TG_TABLE_NAME = 'chat_messages' AND NEW.media_url IS NULL)
  ) THEN
    RAISE EXCEPTION 'empty_message: content cannot be empty';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER ensure_chat_message_content_not_empty
  BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_content_not_empty();

CREATE TRIGGER ensure_anon_message_content_not_empty
  BEFORE INSERT OR UPDATE OF content ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_content_not_empty();
