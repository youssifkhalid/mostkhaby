-- Restore Data API grants and RLS policies for chat + anonymous profile messages.

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chats TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.chat_reactions TO authenticated;
GRANT INSERT ON public.messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.chats TO service_role;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.chat_reactions TO service_role;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can send messages" ON public.messages;
DROP POLICY IF EXISTS "Anon can send messages" ON public.messages;
DROP POLICY IF EXISTS "Auth anon send messages" ON public.messages;
DROP POLICY IF EXISTS "anon_can_insert_messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated_can_insert_messages" ON public.messages;

CREATE POLICY "anon_can_insert_messages"
  ON public.messages
  FOR INSERT
  TO anon
  WITH CHECK (sender_id IS NULL AND sent_by IS NULL);

CREATE POLICY "authenticated_can_insert_messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (sender_id IS NULL AND sent_by = auth.uid())
    OR (sender_id = auth.uid() AND sent_by = auth.uid())
  );

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat participants can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "authenticated_can_send_chat_messages" ON public.chat_messages;

CREATE POLICY "authenticated_can_send_chat_messages"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE id = chat_messages.chat_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Chat participants can see messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_participants_can_view_messages" ON public.chat_messages;

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
