-- Add deleted_by support for chats
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS deleted_by uuid[] DEFAULT '{}';

-- Add last_message_content for chat list preview
ALTER TABLE public.chats ADD COLUMN IF NOT EXISTS last_message_content text;

-- Add UPDATE policy for chats
DROP POLICY IF EXISTS "Chat participants can update" ON public.chats;
CREATE POLICY "Chat participants can update" ON public.chats FOR UPDATE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Add DELETE policy for chats
DROP POLICY IF EXISTS "Chat participants can delete" ON public.chats;
CREATE POLICY "Chat participants can delete" ON public.chats FOR DELETE TO authenticated
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enable realtime for follows table
DO $$ BEGIN
  DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Enable realtime for profiles
DO $$ BEGIN
  DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;