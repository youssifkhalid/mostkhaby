
-- Drop overly permissive notification insert policy
DROP POLICY "System can insert notifications" ON public.notifications;

-- Only allow inserting notifications for the authenticated user or via triggers
CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
