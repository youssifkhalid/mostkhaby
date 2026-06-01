
-- ============================================================
-- PART 1: SECURITY HARDENING
-- ============================================================

-- 1. Lock down notifications direct insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "anon_can_insert_notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
DROP POLICY IF EXISTS "Block client insert notifications" ON public.notifications;
CREATE POLICY "no_direct_insert_notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (false);

-- 2. Delete policy for notifications (already exists as notifications_delete, keep)

-- 3. Rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, action, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON public.rate_limits(user_id, action, window_start);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.rate_limits_id_seq TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rate_limits_own" ON public.rate_limits;
CREATE POLICY "rate_limits_own" ON public.rate_limits
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_action TEXT, p_max_per_minute INTEGER DEFAULT 30)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_window TIMESTAMPTZ := date_trunc('minute', now());
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (auth.uid(), p_action, v_window, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;
  RETURN v_count <= p_max_per_minute;
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER) TO authenticated;

-- 5. Chat message rate limit trigger
CREATE OR REPLACE FUNCTION public.enforce_message_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.check_rate_limit('send_message', 30) THEN
    RAISE EXCEPTION 'rate_limit_exceeded: max 30 messages per minute';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_chat_message_rate_limit ON public.chat_messages;
CREATE TRIGGER enforce_chat_message_rate_limit
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_message_rate_limit();

-- 6. Anon message rate limit
CREATE OR REPLACE FUNCTION public.enforce_anon_message_rate_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.check_rate_limit('send_anon_message', 20) THEN
      RAISE EXCEPTION 'rate_limit_exceeded';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_anon_message_rate_on_messages ON public.messages;
CREATE TRIGGER enforce_anon_message_rate_on_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_anon_message_rate_limit();

-- 7. Content length constraints (NOT VALID to avoid breaking existing data)
DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD CONSTRAINT chat_message_content_length CHECK (content IS NULL OR length(content) <= 5000) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.messages ADD CONSTRAINT anon_message_content_length CHECK (length(content) BETWEEN 1 AND 3000) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT bio_length CHECK (bio IS NULL OR length(bio) <= 500) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_hint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action, created_at DESC);

GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_direct_access_audit" ON public.audit_log;
CREATE POLICY "no_direct_access_audit" ON public.audit_log FOR ALL TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.audit_message_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.audit_log (user_id, action, table_name, record_id, old_data)
  VALUES (auth.uid(), 'soft_delete_message', 'chat_messages', OLD.id::text,
    jsonb_build_object('chat_id', OLD.chat_id, 'sender_id', OLD.sender_id, 'created_at', OLD.created_at));
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_chat_message_delete ON public.chat_messages;
CREATE TRIGGER audit_chat_message_delete
  AFTER UPDATE OF is_deleted ON public.chat_messages
  FOR EACH ROW WHEN (OLD.is_deleted = false AND NEW.is_deleted = true)
  EXECUTE FUNCTION public.audit_message_delete();

-- 9. Block check before chat messages
CREATE OR REPLACE FUNCTION public.check_not_blocked_before_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_other_user UUID;
BEGIN
  SELECT CASE WHEN user1_id = auth.uid() THEN user2_id ELSE user1_id END
    INTO v_other_user FROM public.chats WHERE id = NEW.chat_id;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = v_other_user AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = v_other_user)
  ) THEN
    RAISE EXCEPTION 'user_blocked: cannot send message';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS check_blocked_before_chat_message ON public.chat_messages;
CREATE TRIGGER check_blocked_before_chat_message
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_not_blocked_before_message();

-- 10. Edit time limit (10 minutes)
CREATE OR REPLACE FUNCTION public.enforce_edit_time_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    IF OLD.created_at < now() - INTERVAL '10 minutes' THEN
      RAISE EXCEPTION 'edit_expired: messages can only be edited within 10 minutes';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_message_edit_limit ON public.chat_messages;
CREATE TRIGGER enforce_message_edit_limit
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW WHEN (auth.uid() = OLD.sender_id)
  EXECUTE FUNCTION public.enforce_edit_time_limit();

-- 11. Storage bucket limits
UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'avatars';

UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/wav', 'audio/mpeg']
WHERE id = 'chat-media';

-- ============================================================
-- PART 3: ADVANCED SECURITY
-- ============================================================

-- Spam reports
CREATE TABLE IF NOT EXISTS public.spam_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id UUID,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.spam_reports TO authenticated;
GRANT ALL ON public.spam_reports TO service_role;
ALTER TABLE public.spam_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_can_report" ON public.spam_reports;
CREATE POLICY "users_can_report" ON public.spam_reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "users_see_own_reports" ON public.spam_reports;
CREATE POLICY "users_see_own_reports" ON public.spam_reports
  FOR SELECT TO authenticated USING (auth.uid() = reporter_id);

-- Banned users
CREATE TABLE IF NOT EXISTS public.banned_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banned_users TO authenticated;
GRANT ALL ON public.banned_users TO service_role;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_see_own_ban" ON public.banned_users;
CREATE POLICY "users_see_own_ban" ON public.banned_users
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.banned_users
    WHERE user_id = p_user_id
      AND (banned_until IS NULL OR banned_until > now())
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_user_banned(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_ban_on_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_user_banned() THEN
    RAISE EXCEPTION 'account_banned: your account has been suspended';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_ban_chat_messages ON public.chat_messages;
CREATE TRIGGER enforce_ban_chat_messages
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_insert();
DROP TRIGGER IF EXISTS enforce_ban_anon_messages ON public.messages;
CREATE TRIGGER enforce_ban_anon_messages
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ban_on_insert();

-- Content sanitization
CREATE OR REPLACE FUNCTION public.sanitize_message_content()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.content IS NULL THEN RETURN NEW; END IF;
  NEW.content := regexp_replace(NEW.content, '<[^>]+>', '', 'g');
  NEW.content := replace(NEW.content, chr(0), '');
  NEW.content := trim(NEW.content);
  IF NEW.content = '' AND (TG_TABLE_NAME = 'messages' OR (TG_TABLE_NAME = 'chat_messages' AND NEW.media_url IS NULL)) THEN
    RAISE EXCEPTION 'empty_message: content cannot be empty after sanitization';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS sanitize_chat_message ON public.chat_messages;
CREATE TRIGGER sanitize_chat_message
  BEFORE INSERT OR UPDATE OF content ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_message_content();
DROP TRIGGER IF EXISTS sanitize_anon_message ON public.messages;
CREATE TRIGGER sanitize_anon_message
  BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.sanitize_message_content();

-- Cleanup old data
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '2 hours';
  DELETE FROM public.audit_log WHERE created_at < now() - INTERVAL '90 days';
  UPDATE public.profiles
    SET is_online = false, last_seen = now()
    WHERE is_online = true AND last_seen < now() - INTERVAL '5 minutes';
END;
$$;

-- Reserved usernames
CREATE TABLE IF NOT EXISTS public.reserved_usernames (username TEXT PRIMARY KEY);
GRANT SELECT ON public.reserved_usernames TO anon, authenticated;
GRANT ALL ON public.reserved_usernames TO service_role;
INSERT INTO public.reserved_usernames (username) VALUES
  ('admin'), ('administrator'), ('support'), ('help'), ('mostkhaby'),
  ('مستخبي'), ('api'), ('app'), ('root'), ('system'), ('mod'), ('moderator'),
  ('staff'), ('official'), ('bot'), ('null'), ('undefined'), ('test'),
  ('demo'), ('settings'), ('notifications'), ('chats')
ON CONFLICT DO NOTHING;
ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reserved_usernames_public_read" ON public.reserved_usernames;
CREATE POLICY "reserved_usernames_public_read" ON public.reserved_usernames FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.check_username_not_reserved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.reserved_usernames WHERE username = lower(NEW.username)) THEN
    RAISE EXCEPTION 'reserved_username: this username is not available';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS check_reserved_username ON public.profiles;
CREATE TRIGGER check_reserved_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_username_not_reserved();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_time ON public.chat_messages(chat_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_follows_both ON public.follows(follower_id, following_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles(lower(username));
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;

-- ============================================================
-- PART 5: NEW RPCs
-- ============================================================

CREATE OR REPLACE FUNCTION public.search_messages_in_chat(p_chat_id UUID, p_query TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(id UUID, content TEXT, created_at TIMESTAMPTZ, sender_id UUID, media_type TEXT, media_url TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.content, m.created_at, m.sender_id, m.media_type, m.media_url
  FROM public.chat_messages m
  WHERE m.chat_id = p_chat_id
    AND m.is_deleted = false
    AND m.content ILIKE '%' || p_query || '%'
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = p_chat_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.search_messages_in_chat(UUID, TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_chat(p_other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chat_id UUID;
  v_user1 UUID := LEAST(auth.uid(), p_other_user_id);
  v_user2 UUID := GREATEST(auth.uid(), p_other_user_id);
BEGIN
  IF auth.uid() = p_other_user_id THEN RAISE EXCEPTION 'cannot_chat_with_self'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = p_other_user_id)
       OR (blocker_id = p_other_user_id AND blocked_id = auth.uid())
  ) THEN RAISE EXCEPTION 'user_blocked'; END IF;
  SELECT id INTO v_chat_id FROM public.chats WHERE user1_id = v_user1 AND user2_id = v_user2;
  IF v_chat_id IS NULL THEN
    INSERT INTO public.chats (user1_id, user2_id) VALUES (v_user1, v_user2) RETURNING id INTO v_chat_id;
  END IF;
  RETURN v_chat_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_chat(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_user(p_target_id UUID, p_reason TEXT, p_message_id UUID DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF auth.uid() = p_target_id THEN RAISE EXCEPTION 'cannot_report_self'; END IF;
  IF length(p_reason) < 5 THEN RAISE EXCEPTION 'reason_too_short'; END IF;
  INSERT INTO public.spam_reports (reporter_id, target_id, message_id, reason)
  VALUES (auth.uid(), p_target_id, p_message_id, p_reason);
END;
$$;
GRANT EXECUTE ON FUNCTION public.report_user(UUID, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_stats(p_chat_id UUID)
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'total_messages', COUNT(*),
    'messages_from_me', COUNT(*) FILTER (WHERE sender_id = auth.uid()),
    'media_count', COUNT(*) FILTER (WHERE media_type IS NOT NULL),
    'first_message', MIN(created_at),
    'last_message', MAX(created_at)
  )
  FROM public.chat_messages
  WHERE chat_id = p_chat_id AND is_deleted = false
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = p_chat_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    );
$$;
GRANT EXECUTE ON FUNCTION public.get_chat_stats(UUID) TO authenticated;
