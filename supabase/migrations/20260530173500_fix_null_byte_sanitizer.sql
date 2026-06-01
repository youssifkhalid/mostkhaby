-- Fix message sanitizer: PostgreSQL text cannot contain NUL bytes, and chr(0) itself raises
-- "null character not permitted". Client-side code strips NUL before insert; this
-- trigger now sanitizes HTML/control-safe content without constructing chr(0).
CREATE OR REPLACE FUNCTION public.sanitize_message_content()
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
