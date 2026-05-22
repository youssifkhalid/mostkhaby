
DROP POLICY IF EXISTS "Senders can view their sent messages" ON public.messages;
CREATE POLICY "Senders can view their sent messages" ON public.messages FOR SELECT
USING (auth.uid() = sender_id);
