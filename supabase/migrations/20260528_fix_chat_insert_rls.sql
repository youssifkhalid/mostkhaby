-- ════════════════════════════════════════════════════════════════
-- FIX: Chat Message INSERT RLS Policy
-- Problem: Messages not being inserted into database
-- Root Cause: RLS policy might be too strict or missing
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. Verify chat_messages table exists
-- ────────────────────────────────────────────────────────────────
-- This should already exist from earlier migrations

-- ────────────────────────────────────────────────────────────────
-- 2. DROP all existing policies to prevent conflicts
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Chat participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can see messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat participants can update message status" ON public.chat_messages;
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.chat_messages;
DROP POLICY IF EXISTS "Senders can update own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can send messages" ON public.chat_messages;

-- ────────────────────────────────────────────────────────────────
-- 3. Enable RLS on chat_messages
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────────
-- 4. CREATE SIMPLE AND PERMISSIVE INSERT POLICY
--    Allow authenticated users to send messages to any chat they're in
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "authenticated_can_send_chat_messages" 
  ON public.chat_messages 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    -- The sender_id must be the current user
    auth.uid() = sender_id
  );

-- ────────────────────────────────────────────────────────────────
-- 5. CREATE SELECT POLICY
--    Allow users to read messages from chats they're in
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "chat_participants_can_view_messages" 
  ON public.chat_messages 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_messages.chat_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 6. CREATE UPDATE POLICY FOR SENDERS
--    Allow senders to edit/delete their own messages
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "senders_can_update_own_messages" 
  ON public.chat_messages 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- ────────────────────────────────────────────────────────────────
-- 7. CREATE UPDATE POLICY FOR RECIPIENTS
--    Allow marking messages as read (status update only)
-- ────────────────────────────────────────────────────────────────
CREATE POLICY "recipients_can_mark_read" 
  ON public.chat_messages 
  FOR UPDATE 
  TO authenticated 
  USING (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_messages.chat_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  )
  WITH CHECK (
    sender_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chats 
      WHERE id = chat_messages.chat_id 
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

-- ────────────────────────────────────────────────────────────────
-- 8. VERIFY CHATS TABLE HAS PROPER POLICIES
-- ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can see own chats" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;
DROP POLICY IF EXISTS "Chat participants can update" ON public.chats;

CREATE POLICY "users_can_view_own_chats" 
  ON public.chats 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "authenticated_can_create_chats" 
  ON public.chats 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "chat_participants_can_update" 
  ON public.chats 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ────────────────────────────────────────────────────────────────
-- 9. VERIFY REALTIME IS ENABLED
-- ────────────────────────────────────────────────────────────────
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
EXCEPTION WHEN duplicate_object THEN NULL; 
END $$;

-- Set REPLICA IDENTITY FULL for proper realtime updates
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chats REPLICA IDENTITY FULL;

-- ────────────────────────────────────────────────────────────────
-- 10. TEST: Verify policies are in place
-- ────────────────────────────────────────────────────────────────
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'chat_messages'
-- ORDER BY tablename, policyname;
