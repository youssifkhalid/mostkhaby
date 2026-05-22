
-- Idempotent migration: restore all triggers and realtime

-- 1. handle_new_user trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Spam protection
DROP TRIGGER IF EXISTS check_message_spam ON public.messages;
DROP TRIGGER IF EXISTS check_message_spam ON public.messages;
CREATE TRIGGER check_message_spam
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();

-- 3. Message notification
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();

-- 4. Reply notification
DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
CREATE TRIGGER on_reply_notify
  AFTER INSERT ON public.message_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reply();

-- 5. Follow notification
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

-- 6. Chat message notification
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_chat_message();

-- 7. Updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Auto-update chats.last_message on chat_messages insert
CREATE OR REPLACE FUNCTION public.update_chat_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.chats
  SET last_message_at = NEW.created_at,
      last_message_content = NEW.content
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
CREATE TRIGGER on_chat_message_update_chat
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_last_message();

-- 9. Enable realtime (safe: ignore if already added)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'message_replies') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_replies;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chats') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'follows') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
END $$;

-- 10. Tighten messages INSERT RLS
DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;

-- Allow anonymous (not logged in) to send
DROP POLICY IF EXISTS "Anon can send messages" ON public.messages;
CREATE POLICY "Anon can send messages" ON public.messages FOR INSERT TO anon
WITH CHECK (sender_id IS NULL AND sent_by IS NULL);

-- Allow authenticated anonymous send
DROP POLICY IF EXISTS "Auth anon send messages" ON public.messages;
CREATE POLICY "Auth anon send messages" ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  (sender_id IS NULL AND sent_by = auth.uid())
  OR (sender_id = auth.uid() AND sent_by = auth.uid())
);

-- 11. Remove overly permissive notification insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
