
CREATE OR REPLACE FUNCTION public.notify_on_new_call()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_name text;
  type_label text;
BEGIN
  IF NEW.status <> 'ringing' THEN RETURN NEW; END IF;
  SELECT COALESCE(full_name, username, 'مستخدم') INTO caller_name
    FROM public.profiles WHERE id = NEW.caller_id;
  type_label := CASE WHEN NEW.type = 'video' THEN '📹 مكالمة فيديو واردة' ELSE '📞 مكالمة صوتية واردة' END;
  PERFORM public.send_push_notification(
    NEW.callee_id,
    type_label,
    caller_name || ' بيتصل بيك...',
    '/chat/' || NEW.chat_id::text,
    'call-' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_call ON public.calls;
CREATE TRIGGER trg_notify_on_new_call
AFTER INSERT ON public.calls
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_call();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='chat_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions';
  END IF;
END $$;
