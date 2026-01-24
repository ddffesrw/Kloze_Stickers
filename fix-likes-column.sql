-- FIX: Rename 'like_count' to 'likes_count' or create if missing

DO $$
BEGIN
  -- 1. If 'like_count' exists (singular), rename it to 'likes_count' (plural) to match code
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sticker_packs' AND column_name='like_count') THEN
    ALTER TABLE public.sticker_packs RENAME COLUMN like_count TO likes_count;
    
  -- 2. If 'likes_count' still doesn't exist (neither existed), create it
  ELSIF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sticker_packs' AND column_name='likes_count') THEN
    ALTER TABLE public.sticker_packs ADD COLUMN likes_count INTEGER DEFAULT 0;
  END IF;
END $$;
