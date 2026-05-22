-- =========================================
-- POSTS SYSTEM (Instagram-like)
-- =========================================

-- 1) Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  caption text,
  media_type text NOT NULL DEFAULT 'none' CHECK (media_type IN ('none','image','carousel','video')),
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','followers','private')),
  hashtags text[] DEFAULT '{}',
  mentions uuid[] DEFAULT '{}',
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0,
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON public.posts(privacy);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags ON public.posts USING GIN(hashtags);

-- 2) Post media (carousel support)
CREATE TABLE IF NOT EXISTS public.post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('image','video')),
  position integer NOT NULL DEFAULT 0,
  width integer,
  height integer,
  duration integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_media_post ON public.post_media(post_id, position);

-- 3) Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);

-- 4) Comments
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  is_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_id);

-- 5) Saved posts
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON public.saved_posts(user_id, created_at DESC);

-- 6) Reports
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL CHECK (length(reason) BETWEEN 1 AND 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON public.post_reports(post_id);

-- =========================================
-- HELPER: can_view_post (avoids recursion)
-- =========================================
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = _post_id
      AND (
        p.privacy = 'public'
        OR p.author_id = _user_id
        OR (p.privacy = 'followers' AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = _user_id
            AND f.following_id = p.author_id
            AND f.status = 'accepted'
        ))
      )
  );
$$;

-- =========================================
-- ENABLE RLS
-- =========================================
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

-- =========================================
-- POSTS POLICIES
-- =========================================
DROP POLICY IF EXISTS "Public posts visible to all auth" ON public.posts;
CREATE POLICY "Public posts visible to all auth" ON public.posts FOR SELECT TO authenticated
  USING (
    privacy = 'public'
    OR author_id = auth.uid()
    OR (privacy = 'followers' AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = auth.uid()
        AND f.following_id = posts.author_id
        AND f.status = 'accepted'
    ))
  );

DROP POLICY IF EXISTS "Users insert own posts" ON public.posts;
CREATE POLICY "Users insert own posts" ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users update own posts" ON public.posts;
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users delete own posts" ON public.posts;
CREATE POLICY "Users delete own posts" ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = author_id);

-- =========================================
-- POST MEDIA POLICIES
-- =========================================
DROP POLICY IF EXISTS "Media follows post visibility" ON public.post_media;
CREATE POLICY "Media follows post visibility" ON public.post_media FOR SELECT TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Authors insert own media" ON public.post_media;
CREATE POLICY "Authors insert own media" ON public.post_media FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_media.post_id AND p.author_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Authors delete own media" ON public.post_media;
CREATE POLICY "Authors delete own media" ON public.post_media FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_media.post_id AND p.author_id = auth.uid()
  ));

-- =========================================
-- LIKES POLICIES
-- =========================================
DROP POLICY IF EXISTS "Likes visible if post visible" ON public.post_likes;
CREATE POLICY "Likes visible if post visible" ON public.post_likes FOR SELECT TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Users like visible posts" ON public.post_likes;
CREATE POLICY "Users like visible posts" ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Users unlike own likes" ON public.post_likes;
CREATE POLICY "Users unlike own likes" ON public.post_likes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- COMMENTS POLICIES
-- =========================================
DROP POLICY IF EXISTS "Comments visible if post visible" ON public.post_comments;
CREATE POLICY "Comments visible if post visible" ON public.post_comments FOR SELECT TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Users comment on visible posts" ON public.post_comments;
CREATE POLICY "Users comment on visible posts" ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Users update own comments" ON public.post_comments;
CREATE POLICY "Users update own comments" ON public.post_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own comments" ON public.post_comments;
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- SAVED POSTS POLICIES
-- =========================================
DROP POLICY IF EXISTS "Users see own saves" ON public.saved_posts;
CREATE POLICY "Users see own saves" ON public.saved_posts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users save visible posts" ON public.saved_posts;
CREATE POLICY "Users save visible posts" ON public.saved_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.can_view_post(post_id, auth.uid()));

DROP POLICY IF EXISTS "Users unsave own saves" ON public.saved_posts;
CREATE POLICY "Users unsave own saves" ON public.saved_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================
-- REPORTS POLICIES
-- =========================================
DROP POLICY IF EXISTS "Users insert own reports" ON public.post_reports;
CREATE POLICY "Users insert own reports" ON public.post_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users view own reports" ON public.post_reports;
CREATE POLICY "Users view own reports" ON public.post_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

-- =========================================
-- COUNTER TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION public.bump_post_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_post_likes_count ON public.post_likes;
CREATE TRIGGER trg_post_likes_count
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.bump_post_likes();

CREATE OR REPLACE FUNCTION public.bump_post_comments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_post_comments_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_post_comments();

CREATE OR REPLACE FUNCTION public.bump_post_saves()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET saves_count = saves_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET saves_count = GREATEST(saves_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_post_saves_count ON public.saved_posts;
CREATE TRIGGER trg_post_saves_count
AFTER INSERT OR DELETE ON public.saved_posts
FOR EACH ROW EXECUTE FUNCTION public.bump_post_saves();

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_posts_updated ON public.posts;
CREATE TRIGGER trg_posts_updated
BEFORE UPDATE ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_post_comments_updated ON public.post_comments;
CREATE TRIGGER trg_post_comments_updated
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- STORAGE BUCKET for posts media
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts-media', 'posts-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Posts media public read" ON storage.objects;
CREATE POLICY "Posts media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'posts-media');

DROP POLICY IF EXISTS "Users upload own posts media" ON storage.objects;
CREATE POLICY "Users upload own posts media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'posts-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own posts media" ON storage.objects;
CREATE POLICY "Users delete own posts media" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'posts-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Realtime
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;
DO $mig$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
EXCEPTION WHEN duplicate_object THEN NULL; END $mig$;