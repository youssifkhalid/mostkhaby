-- Rebind message sanitization triggers away from the old function that called chr(0).
-- PostgreSQL text cannot even construct chr(0), so the old trigger broke every INSERT.

DROP TRIGGER IF EXISTS sanitize_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS sanitize_anon_message ON public.messages;
DROP FUNCTION IF EXISTS public.sanitize_message_content();

CREATE OR REPLACE FUNCTION public.sanitize_user_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.content IS NULL THEN
    RETURN NEW;
  END IF;

  NEW.content := regexp_replace(NEW.content, '<[^>]+>', '', 'g');
  NEW.content := regexp_replace(NEW.content, '[[:cntrl:]]', '', 'g');
  NEW.content := trim(NEW.content);

  IF NEW.content = '' AND (
    TG_TABLE_NAME = 'messages' OR
    (TG_TABLE_NAME = 'chat_messages' AND NEW.media_url IS NULL)
  ) THEN
    RAISE EXCEPTION 'empty_message: content cannot be empty after sanitization';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER sanitize_chat_message
  BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_message_content();

CREATE TRIGGER sanitize_anon_message
  BEFORE INSERT OR UPDATE OF content ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_user_message_content();
