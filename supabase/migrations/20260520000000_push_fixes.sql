-- 1) Re-define send_push_notification to use the correct project ID
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_url text DEFAULT '/',
  p_tag text DEFAULT 'general'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
BEGIN
  v_url := 'https://nckqldzfhxigguagerei.supabase.co/functions/v1/send-push';
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'url', p_url,
      'tag', p_tag
    )
  );
EXCEPTION WHEN OTHERS THEN
  -- never block the original insert
  NULL;
END;
$$;

-- 2) Define register_push_subscription security definer function
CREATE OR REPLACE FUNCTION public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete any existing subscription for this endpoint (so the new user takes it over)
  DELETE FROM public.push_subscriptions WHERE endpoint = p_endpoint;
  
  -- Insert the new subscription for the current authenticated user
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent);
END;
$$;
