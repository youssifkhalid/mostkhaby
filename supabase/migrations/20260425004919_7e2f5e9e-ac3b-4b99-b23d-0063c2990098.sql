
-- Allow chat participants (not just owner) to read media referenced in their chat_messages
DROP POLICY IF EXISTS "Chat media: participants read" ON storage.objects;
CREATE POLICY "Chat media: participants read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chats c ON c.id = cm.chat_id
      WHERE cm.media_url LIKE '%' || storage.objects.name
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
