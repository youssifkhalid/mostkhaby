
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  width int,
  height int,
  duration int NOT NULL DEFAULT 5,
  caption text,
  overlays jsonb NOT NULL DEFAULT '[]'::jsonb,
  privacy text NOT NULL DEFAULT 'public' CHECK (privacy IN ('public','followers','close_friends')),
  views_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_stories_author_created ON public.stories(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON public.stories(expires_at);

CREATE TABLE IF NOT EXISTS public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_viewer ON public.story_views(viewer_id);

CREATE TABLE IF NOT EXISTS public.story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  replier_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_replies_story ON public.story_replies(story_id);

CREATE TABLE IF NOT EXISTS public.close_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, friend_id)
);
CREATE INDEX IF NOT EXISTS idx_close_friends_owner ON public.close_friends(owner_id);

CREATE TABLE IF NOT EXISTS public.story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  title text NOT NULL,
  cover_url text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_story_highlights_owner ON public.story_highlights(owner_id, position);

CREATE TABLE IF NOT EXISTS public.highlight_stories (
  highlight_id uuid NOT NULL,
  story_id uuid NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (highlight_id, story_id)
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_story(_story_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = _story_id
      AND s.expires_at > now()
      AND (
        s.author_id = _user_id
        OR s.privacy = 'public'
        OR (s.privacy = 'followers' AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = _user_id AND f.following_id = s.author_id AND f.status = 'accepted'
        ))
        OR (s.privacy = 'close_friends' AND EXISTS (
          SELECT 1 FROM public.close_friends cf
          WHERE cf.owner_id = s.author_id AND cf.friend_id = _user_id
        ))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.bump_story_views()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  END IF;
  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS trg_bump_story_views ON public.story_views;
CREATE TRIGGER trg_bump_story_views
AFTER INSERT ON public.story_views
FOR EACH ROW EXECUTE FUNCTION public.bump_story_views();

DROP POLICY IF EXISTS "Stories visible if active and allowed" ON public.stories;
CREATE POLICY "Stories visible if active and allowed" ON public.stories FOR SELECT TO authenticated
USING (
  author_id = auth.uid()
  OR (
    expires_at > now()
    AND (
      privacy = 'public'
      OR (privacy = 'followers' AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid() AND f.following_id = stories.author_id AND f.status = 'accepted'
      ))
      OR (privacy = 'close_friends' AND EXISTS (
        SELECT 1 FROM public.close_friends cf
        WHERE cf.owner_id = stories.author_id AND cf.friend_id = auth.uid()
      ))
    )
  )
);

DROP POLICY IF EXISTS "Users insert own stories" ON public.stories;
CREATE POLICY "Users insert own stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "Users update own stories" ON public.stories;
CREATE POLICY "Users update own stories" ON public.stories FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
DROP POLICY IF EXISTS "Users delete own stories" ON public.stories;
CREATE POLICY "Users delete own stories" ON public.stories FOR DELETE TO authenticated USING (author_id = auth.uid());

DROP POLICY IF EXISTS "Viewer or story owner sees views" ON public.story_views;
CREATE POLICY "Viewer or story owner sees views" ON public.story_views FOR SELECT TO authenticated
USING (
  viewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_views.story_id AND s.author_id = auth.uid())
);
DROP POLICY IF EXISTS "Users register own views on visible stories" ON public.story_views;
CREATE POLICY "Users register own views on visible stories" ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id = auth.uid() AND public.can_view_story(story_id, auth.uid()));

DROP POLICY IF EXISTS "Replier or story owner sees replies" ON public.story_replies;
CREATE POLICY "Replier or story owner sees replies" ON public.story_replies FOR SELECT TO authenticated
USING (
  replier_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.stories s WHERE s.id = story_replies.story_id AND s.author_id = auth.uid())
);
DROP POLICY IF EXISTS "Users reply to visible stories" ON public.story_replies;
CREATE POLICY "Users reply to visible stories" ON public.story_replies FOR INSERT TO authenticated
WITH CHECK (replier_id = auth.uid() AND public.can_view_story(story_id, auth.uid()));

DROP POLICY IF EXISTS "Owners view own close friends" ON public.close_friends;
CREATE POLICY "Owners view own close friends" ON public.close_friends FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners add close friends" ON public.close_friends;
CREATE POLICY "Owners add close friends" ON public.close_friends FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners remove close friends" ON public.close_friends;
CREATE POLICY "Owners remove close friends" ON public.close_friends FOR DELETE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Highlights public read" ON public.story_highlights;
CREATE POLICY "Highlights public read" ON public.story_highlights FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Owners insert highlights" ON public.story_highlights;
CREATE POLICY "Owners insert highlights" ON public.story_highlights FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners update highlights" ON public.story_highlights;
CREATE POLICY "Owners update highlights" ON public.story_highlights FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners delete highlights" ON public.story_highlights;
CREATE POLICY "Owners delete highlights" ON public.story_highlights FOR DELETE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Highlight stories public read" ON public.highlight_stories;
CREATE POLICY "Highlight stories public read" ON public.highlight_stories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Owner adds to own highlight" ON public.highlight_stories;
CREATE POLICY "Owner adds to own highlight" ON public.highlight_stories FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.story_highlights h WHERE h.id = highlight_stories.highlight_id AND h.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Owner removes from own highlight" ON public.highlight_stories;
CREATE POLICY "Owner removes from own highlight" ON public.highlight_stories FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.story_highlights h WHERE h.id = highlight_stories.highlight_id AND h.owner_id = auth.uid()));

INSERT INTO storage.buckets (id, name, public)
VALUES ('stories-media', 'stories-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Stories media public read" ON storage.objects;
CREATE POLICY "Stories media public read" ON storage.objects FOR SELECT USING (bucket_id = 'stories-media');
DROP POLICY IF EXISTS "Users upload to own stories folder" ON storage.objects;
CREATE POLICY "Users upload to own stories folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'stories-media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users update own stories media" ON storage.objects;
CREATE POLICY "Users update own stories media" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'stories-media' AND auth.uid()::text = (storage.foldername(name))[1]);
DROP POLICY IF EXISTS "Users delete own stories media" ON storage.objects;
CREATE POLICY "Users delete own stories media" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'stories-media' AND auth.uid()::text = (storage.foldername(name))[1]);
