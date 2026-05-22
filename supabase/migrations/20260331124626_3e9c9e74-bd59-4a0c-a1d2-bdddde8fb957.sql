
-- Recreate all triggers that are missing

-- 1. Spam protection trigger
DROP TRIGGER IF EXISTS check_message_spam ON public.messages;
DROP TRIGGER IF EXISTS check_message_spam ON public.messages;
CREATE TRIGGER check_message_spam
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.check_message_rate_limit();

-- 2. New message notification trigger
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();

-- 3. Reply notification trigger
DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
DROP TRIGGER IF EXISTS on_reply_notify ON public.message_replies;
CREATE TRIGGER on_reply_notify
  AFTER INSERT ON public.message_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_reply();

-- 4. Follow notification trigger
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
DROP TRIGGER IF EXISTS on_follow_notify ON public.follows;
CREATE TRIGGER on_follow_notify
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

-- 5. Chat message notification trigger
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
CREATE TRIGGER on_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_chat_message();

-- 6. Updated_at trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Updated_at trigger for user_settings
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all core tables
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_replies;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
