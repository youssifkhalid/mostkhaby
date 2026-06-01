-- =========================================================
-- Migration: Email Notifications + SEO + Security
-- Date: 2026-06-01
-- =========================================================

-- 1. Email notification log table
CREATE TABLE IF NOT EXISTS email_notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  type text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  resend_id text,
  error text,
  metadata jsonb DEFAULT '{}'
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_type ON email_notification_log(type);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at ON email_notification_log(sent_at DESC);

-- RLS
ALTER TABLE email_notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own email logs"
  ON email_notification_log FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Add email_notifications_unsubscribed column to user_settings
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS email_new_message boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_follow boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_like boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_security boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_emails boolean DEFAULT true;

-- 3. Add profile SEO fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS profile_url text GENERATED ALWAYS AS ('https://mstkhbi.app/' || username) STORED;

-- 4. Function to send email notification (called by triggers)
CREATE OR REPLACE FUNCTION notify_user_email(
  p_user_id uuid,
  p_type text,
  p_data jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email text;
  v_settings record;
BEGIN
  -- Get user email
  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RETURN; END IF;

  -- Check notification preferences
  SELECT * INTO v_settings FROM user_settings WHERE user_id = p_user_id;

  -- Check if email notifications enabled globally
  IF v_settings.email_notifications = false THEN RETURN; END IF;

  -- Type-specific checks
  IF p_type = 'new_message' AND v_settings.email_new_message = false THEN RETURN; END IF;
  IF p_type = 'follow' AND v_settings.email_follow = false THEN RETURN; END IF;
  IF p_type = 'security_alert' AND v_settings.email_security = false THEN RETURN; END IF;

  -- Log the email (actual sending via edge function from frontend)
  INSERT INTO email_notification_log (user_id, email, type, metadata)
  VALUES (p_user_id, v_email, p_type, p_data);
END;
$$;

-- 5. Invite/referral system
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(referrer_id, referred_id)
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own referrals"
  ON referrals FOR SELECT USING (auth.uid() = referrer_id);

-- Add referral_code to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT substring(md5(random()::text), 1, 8);

-- 6. Ensure blocked_users RLS is correct for avatar/profile joins
DROP POLICY IF EXISTS "Users see own blocked list" ON blocked_users;
CREATE POLICY "Users see own blocked list"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

-- 7. Grant execute on notify function
GRANT EXECUTE ON FUNCTION notify_user_email TO authenticated;
