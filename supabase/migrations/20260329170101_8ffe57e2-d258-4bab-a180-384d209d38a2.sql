
-- Add sent_by column: tracks who actually sent the message (hidden from receiver)
-- sender_id remains null for anonymous messages (what receiver sees)
-- sent_by always stores the actual sender for their "sent" tab
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sent_by uuid REFERENCES public.profiles(id);

-- Update existing messages: set sent_by = sender_id where sender_id is not null
UPDATE public.messages SET sent_by = sender_id WHERE sender_id IS NOT NULL AND sent_by IS NULL;

-- RLS: Allow users to see messages they sent (via sent_by)
DROP POLICY IF EXISTS "Users can view messages they sent via sent_by" ON public.messages;
CREATE POLICY "Users can view messages they sent via sent_by" ON public.messages FOR SELECT
USING (auth.uid() = sent_by);
