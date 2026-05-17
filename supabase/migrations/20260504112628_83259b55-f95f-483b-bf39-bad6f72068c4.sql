ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS audio_title text,
  ADD COLUMN IF NOT EXISTS audio_artist text,
  ADD COLUMN IF NOT EXISTS audio_cover text,
  ADD COLUMN IF NOT EXISTS audio_start integer DEFAULT 0;