-- Remove legacy duplicate message triggers left by older migrations.
-- These could run old trigger functions alongside the rebuilt safe triggers.

DROP TRIGGER IF EXISTS notify_on_new_chat_message_trigger ON public.chat_messages;
DROP TRIGGER IF EXISTS update_chat_last_message_trigger ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS trg_notify_on_new_chat_message ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_chat_message_notify ON public.chat_messages;
DROP TRIGGER IF EXISTS on_chat_message_update_chat ON public.chat_messages;
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;

CREATE TRIGGER on_chat_message_update_chat
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_last_message();

CREATE TRIGGER on_new_chat_message_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_chat_message();

CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();
