
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS hide_from_search boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_images boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_block_offensive boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS social_visibility text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'ar';
