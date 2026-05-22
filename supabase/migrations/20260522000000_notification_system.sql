-- ════════════════════════════════════════════════════════════════
-- Advanced Notification System — supporting tables
-- ════════════════════════════════════════════════════════════════
-- Adds: user_presence, chat_mutes, push_delivery_log, helper RPCs.
-- Idempotent.

-- user_presence -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_chat_id   UUID,
  is_online        BOOLEAN NOT NULL DEFAULT false,
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_presence_active_chat_idx
  ON public.user_presence(active_chat_id) WHERE active_chat_id IS NOT NULL;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presence_select_all_authed" ON public.user_presence;
CREATE POLICY "presence_select_all_authed" ON public.user_presence
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "presence_upsert_self" ON public.user_presence;
CREATE POLICY "presence_upsert_self" ON public.user_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "presence_update_self" ON public.user_presence;
CREATE POLICY "presence_update_self" ON public.user_presence
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_user_presence(p_active_chat_id UUID, p_is_online BOOLEAN)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_presence (user_id, active_chat_id, is_online, last_seen_at, updated_at)
    VALUES (auth.uid(), p_active_chat_id, COALESCE(p_is_online, true), now(), now())
  ON CONFLICT (user_id) DO UPDATE SET
    active_chat_id = EXCLUDED.active_chat_id,
    is_online      = EXCLUDED.is_online,
    last_seen_at   = now(),
    updated_at     = now();
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_user_presence(UUID, BOOLEAN) TO authenticated;

-- chat_mutes ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_mutes (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id      UUID NOT NULL,
  muted_until  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chat_id)
);
ALTER TABLE public.chat_mutes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mutes_own" ON public.chat_mutes;
CREATE POLICY "mutes_own" ON public.chat_mutes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_chat_muted(p_user_id UUID, p_chat_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_mutes
    WHERE user_id = p_user_id AND chat_id = p_chat_id
      AND (muted_until IS NULL OR muted_until > now())
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_chat_muted(UUID, UUID) TO authenticated, service_role;

-- push_delivery_log ---------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_delivery_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  chat_id     UUID,
  msg_id      UUID,
  status      TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_delivery_log_user_idx
  ON public.push_delivery_log(user_id, created_at DESC);
ALTER TABLE public.push_delivery_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delivery_log_read_own" ON public.push_delivery_log;
CREATE POLICY "delivery_log_read_own" ON public.push_delivery_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- is_user_active_in_chat ----------------------------------------
CREATE OR REPLACE FUNCTION public.is_user_active_in_chat(
  p_user_id UUID, p_chat_id UUID, p_freshness_seconds INTEGER DEFAULT 15
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_presence
    WHERE user_id = p_user_id AND active_chat_id = p_chat_id
      AND is_online = true
      AND last_seen_at > now() - make_interval(secs => p_freshness_seconds)
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_user_active_in_chat(UUID, UUID, INTEGER) TO authenticated, service_role;
