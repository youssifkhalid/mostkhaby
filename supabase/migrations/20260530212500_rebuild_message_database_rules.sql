-- Rebuild message/chat database rules into one consistent, non-blocking setup.
-- Fixes repeated broken sanitizer/notification/update triggers and restores Data API access.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_edited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text,
  ADD COLUMN IF NOT EXISTS audio_duration integer,
  ADD COLUMN IF NOT EXISTS waveform jsonb;

ALTER TABLE public.chats
  ADD COLUMN IF NOT EXISTS last_message_content text,
  ADD COLUMN IF NOT EXISTS last_message_sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cleared_before jsonb NOT NULL DEFAULT '{}'::jsonb;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT INSERT ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.chats TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.chat_reactions TO service_role;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can view their messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can update their messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can delete their messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can view their sent messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages they sent via sent_by" ON public.messages;
DROP POLICY IF EXISTS "Anon can send messages" ON public.messages;
DROP POLICY IF EXISTS "Auth anon send messages" ON public.messages;
DROP POLICY IF EXISTS "anon_can_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated_can_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "messages_receiver_select" ON public.messages;
DROP POLICY IF EXISTS "messages_sender_select" ON public.messages;
DROP POLICY IF EXISTS "messages_receiver_update" ON public.messages;
DROP POLICY IF EXISTS "messages_receiver_delete" ON public.messages;

CREATE POLICY "anon_can_insert_messages"
  ON public.messages FOR INSERT TO anon
  WITH CHECK (receiver_id IS NOT NULL AND sender_id IS NULL AND sent_by IS NULL AND length(trim(content)) > 0);

CREATE POLICY "authenticated_can_insert_messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    receiver_id IS NOT NULL
    AND length(trim(content)) > 0
    AND (
      (sender_id IS NULL AND sent_by = auth.uid())
      OR (sender_id = auth.uid() AND sent_by = auth.uid())
    )
  );

CREATE POLICY "messages_receiver_select"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = receiver_id AND is_deleted = false);

CREATE POLICY "messages_sender_select"
  ON public.messages FOR SELECT TO authenticated
  USING (auth.uid() = sent_by);

CREATE POLICY "messages_receiver_update"
  ON public.messages FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

CREATE POLICY "messages_receiver_delete"
  ON public.messages FOR DELETE TO authenticated
  USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can see own chats" ON public.chats;
DROP POLICY IF EXISTS "Authenticated can create chats" ON public.chats;
DROP POLICY IF EXISTS "Chat participants can update" ON public.chats;
DROP POLICY IF EXISTS "Chat participants can delete" ON public.chats;
DROP POLICY IF EXISTS "chats_participants_select" ON public.chats;
DROP POLICY IF EXISTS "chats_participants_insert" ON public.chats;
DROP POLICY IF EXISTS "chats_participants_update" ON public.chats;

CREATE POLICY "chats_participants_select"
  ON public.chats FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chats_participants_insert"
  ON public.chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chats_participants_update"
  ON public.chats FOR UPDATE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Chat participants can see messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can update message status" ON public.chat_messages;
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.chat_messages;
DROP POLICY IF EXISTS "Senders can update own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Senders can delete own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "authenticated_can_send_chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_participants_can_view_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_participants_select" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_participants_insert" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_participants_update" ON public.chat_messages;

CREATE POLICY "chat_messages_participants_select"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_participants_insert"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND length(trim(content)) > 0
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

CREATE POLICY "chat_messages_participants_update"
  ON public.chat_messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_messages.chat_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP TRIGGER IF EXISTS sanitize_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS sanitize_anon_message ON public.messages;
DROP TRIGGER IF EXISTS ensure_chat_message_content_not_empty ON public.chat_messages;
DROP TRIGGER IF EXISTS ensure_anon_message_content_not_empty ON public.messages;
DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS trg_notify_on_new_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS check_message_spam ON public.messages;

DROP FUNCTION IF EXISTS public.sanitize_message_content() CASCADE;
DROP FUNCTION IF EXISTS public.sanitize_user_message_content() CASCADE;

CREATE OR REPLACE FUNCTION public.ensure_message_content_not_empty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.content := trim(COALESCE(NEW.content, ''));
  IF NEW.content = '' AND (TG_TABLE_NAME = 'messages' OR (TG_TABLE_NAME = 'chat_messages' AND NEW.media_url IS NULL)) THEN
    RAISE EXCEPTION 'empty_message: content cannot be empty';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  display_content text;
BEGIN
  IF NEW.media_type = 'image' THEN
    display_content := '📷 صورة';
  ELSIF NEW.media_type = 'audio' THEN
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

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
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

CREATE OR REPLACE FUNCTION public.notify_on_new_chat_message()
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

CREATE TRIGGER ensure_chat_message_content_not_empty
  BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_content_not_empty();

CREATE TRIGGER ensure_anon_message_content_not_empty
  BEFORE INSERT OR UPDATE OF content ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_message_content_not_empty();

CREATE TRIGGER on_chat_message_update_chat
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message();

CREATE TRIGGER on_new_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat_message();

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_time_live
  ON public.chat_messages(chat_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_receiver_time_live
  ON public.messages(receiver_id, created_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_messages_sent_by_time
  ON public.messages(sent_by, created_at DESC);
