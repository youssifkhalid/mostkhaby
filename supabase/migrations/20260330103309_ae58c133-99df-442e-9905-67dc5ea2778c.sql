
-- Create missing triggers for reply notifications and follow notifications

CREATE OR REPLACE TRIGGER on_reply_notify
AFTER INSERT ON public.message_replies
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_reply();

CREATE OR REPLACE TRIGGER on_follow_notify
AFTER INSERT ON public.follows
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_follow();
