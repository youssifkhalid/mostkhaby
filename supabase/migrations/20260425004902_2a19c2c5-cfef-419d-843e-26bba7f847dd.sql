
-- 1) Add media columns to chat_messages
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS audio_duration integer,
  ADD COLUMN IF NOT EXISTS waveform jsonb;

-- 2) Add cleared_before per-user to chats
ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS cleared_before jsonb DEFAULT '{}'::jsonb;

-- 3) Calls table
CREATE TABLE IF NOT EXISTS public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  duration integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calls_chat ON public.calls(chat_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_callee ON public.calls(callee_id, status);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view calls" ON public.calls;
CREATE POLICY "Participants can view calls" ON public.calls
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = callee_id);

DROP POLICY IF EXISTS "Authenticated can create calls" ON public.calls;
CREATE POLICY "Authenticated can create calls" ON public.calls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);

DROP POLICY IF EXISTS "Participants can update calls" ON public.calls;
CREATE POLICY "Participants can update calls" ON public.calls
  FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;

-- 4) Storage bucket for chat media (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users own folder = their user id
DROP POLICY IF EXISTS "Chat media: owner read" ON storage.objects;
CREATE POLICY "Chat media: owner read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Chat media: owner insert" ON storage.objects;
CREATE POLICY "Chat media: owner insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Chat media: owner delete" ON storage.objects;
CREATE POLICY "Chat media: owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5) Update notify_on_new_chat_message to include sender avatar + media type
CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  recipient_id uuid;
  sender_name text;
  sender_avatar text;
  preview_text text;
BEGIN
  SELECT CASE WHEN c.user1_id = NEW.sender_id THEN c.user2_id ELSE c.user1_id END
    INTO recipient_id FROM public.chats c WHERE c.id = NEW.chat_id;
  SELECT COALESCE(full_name, username, 'صديق'), avatar_url INTO sender_name, sender_avatar
    FROM public.profiles WHERE id = NEW.sender_id;

  -- Build preview based on media_type
  IF NEW.media_type = 'image' THEN
    preview_text := '📷 صورة';
  ELSIF NEW.media_type = 'audio' THEN
    preview_text := '🎤 رسالة صوتية';
  ELSE
    preview_text := LEFT(COALESCE(NEW.content, ''), 200);
  END IF;

  IF recipient_id IS NOT NULL AND recipient_id <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, content, type)
    VALUES (recipient_id, sender_name || ': ' || preview_text, 'message');
    PERFORM public.send_push_notification(
      recipient_id,
      sender_name,
      preview_text,
      '/chat/' || NEW.chat_id::text,
      'chat-' || NEW.chat_id::text
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS notify_on_new_chat_message_trigger ON public.chat_messages;
CREATE TRIGGER notify_on_new_chat_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_chat_message();

-- update_chat_last_message trigger - ensure it exists
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON public.chat_messages;
CREATE TRIGGER update_chat_last_message_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_last_message();
