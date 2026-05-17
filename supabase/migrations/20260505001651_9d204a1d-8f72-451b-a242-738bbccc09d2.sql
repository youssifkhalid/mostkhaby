ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER TABLE public.stories REPLICA IDENTITY FULL;