DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
ALTER TABLE public.stories REPLICA IDENTITY FULL;