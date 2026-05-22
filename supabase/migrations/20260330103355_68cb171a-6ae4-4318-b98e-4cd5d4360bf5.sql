
-- Allow sent_by users to also see replies to messages they sent
DROP POLICY IF EXISTS "Sent_by can see replies" ON public.message_replies;
CREATE POLICY "Sent_by can see replies" ON public.message_replies
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM messages
    WHERE messages.id = message_replies.message_id
    AND messages.sent_by = auth.uid()
  )
);

-- Allow sent_by users to also reply (for reply-to-reply flow)
DROP POLICY IF EXISTS "Sent_by can reply" ON public.message_replies;
CREATE POLICY "Sent_by can reply" ON public.message_replies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = replier_id
  AND EXISTS (
    SELECT 1 FROM messages
    WHERE messages.id = message_replies.message_id
    AND messages.sent_by = auth.uid()
  )
);
