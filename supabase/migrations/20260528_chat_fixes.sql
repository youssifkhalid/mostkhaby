-- ════════════════════════════════════════════════════════════════
-- CHAT MESSAGE FIXES — Prevents messages from disappearing
-- ════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. Add last_message_sender_id (for showing "You: ..." in chat list)
-- ────────────────────────────────────────────────────────────��──
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS last_message_sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ───────────────────────────────────────────────────────────────
-- 2. Update trigger to set last_message_sender_id
-- ───────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.update_chat_last_message() CASCADE;

CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.chats
  SET 
    last_message_at = NEW.created_at,
    last_message_content = NEW.content,
    last_message_sender_id = NEW.sender_id
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$function$;

-- ───────────────────────────────────────────────────────────────
-- 3. Recreate trigger for chat_messages INSERT
-- ───────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON public.chat_messages;

CREATE TRIGGER update_chat_last_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_last_message();

-- ───────────────────────────────────────────────────────────────
-- 4. Ensure all chat_messages have proper status field default
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;

-- ───────────────────────────────────────────────────────────────
-- 5. Create index for faster message queries
-- ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_chat_messages_by_chat_and_time
  ON public.chat_messages(chat_id, created_at DESC)
  WHERE is_deleted = false;

-- ───────────────────────────────────────────────────────────────
-- 6. Enable realtime for chats table
-- ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Set replica identity to FULL for proper UPDATE payloads
ALTER TABLE public.chats REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- ───────────────────────────────────────────────────────────────
-- 7. Test message insertion (optional)
-- ───────────────────────────────────────────────────────────────
-- SELECT * FROM public.chats ORDER BY updated_at DESC LIMIT 1;
-- SELECT * FROM public.chat_messages ORDER BY created_at DESC LIMIT 5;
