
-- Recreate all missing triggers

-- Trigger for new message notification
CREATE OR REPLACE TRIGGER on_new_message_notify
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_message();

-- Trigger for reply notification  
CREATE OR REPLACE TRIGGER on_reply_notify
AFTER INSERT ON public.message_replies
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_reply();

-- Trigger for follow notification
CREATE OR REPLACE TRIGGER on_follow_notify
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow();

-- Trigger for chat message notification
CREATE OR REPLACE TRIGGER on_chat_message_notify
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_new_chat_message();

-- Trigger for updated_at on profiles
CREATE OR REPLACE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on user_settings
CREATE OR REPLACE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure realtime is enabled for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Add rate limiting: server-side check function
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
    AND (sent_by = NEW.sent_by OR (NEW.sent_by IS NULL AND sender_id IS NULL))
    AND created_at > now() - interval '1 minute';
  
  IF recent_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please wait before sending more messages.';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER check_message_spam
BEFORE INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.check_message_rate_limit();
