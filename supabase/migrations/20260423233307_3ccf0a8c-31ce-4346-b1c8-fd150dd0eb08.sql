-- 1. Recreate all triggers (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS check_message_spam ON public.messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

-- 2. Tighten rate limit (per receiver)
CREATE OR REPLACE FUNCTION public.check_message_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count integer;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.messages
  WHERE receiver_id = NEW.receiver_id
    AND created_at > now() - interval '1 minute';
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_message_spam ON public.messages;
CREATE TRIGGER check_message_spam
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.check_message_rate_limit();

DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();

DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
CREATE TRIGGER on_reply_notify
  AFTER INSERT ON public.message_replies
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_reply();

DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat_message();

DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
CREATE TRIGGER on_chat_message_update_chat
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Notifications: disallow client-side INSERT (triggers use SECURITY DEFINER and bypass RLS)
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;

-- 4. Realtime publication (safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='messages') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='message_replies') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_replies;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='chat_messages') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='chats') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='profiles') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='follows') THEN
    DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
  END IF;
END $$;