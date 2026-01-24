-- SOCIAL FEATURES UPDATE
-- Run this to enable Likes and Trending Packs

-- 1. Create pack_likes table
CREATE TABLE IF NOT EXISTS public.pack_likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

-- 2. Add likes_count to sticker_packs if not exists
ALTER TABLE public.sticker_packs 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- 3. RLS for Likes
ALTER TABLE public.pack_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view likes" ON public.pack_likes;
CREATE POLICY "Public view likes" ON public.pack_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users toggle own likes" ON public.pack_likes;
CREATE POLICY "Users toggle own likes" ON public.pack_likes 
FOR ALL USING (auth.uid() = user_id);

-- 4. RPC: Toggle Like
CREATE OR REPLACE FUNCTION toggle_pack_like(p_pack_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
  is_liked BOOLEAN;
  new_count INT;
BEGIN
  uid := auth.uid();
  
  -- Check if exists
  IF EXISTS (SELECT 1 FROM public.pack_likes WHERE user_id = uid AND pack_id = p_pack_id) THEN
    -- Unlike
    DELETE FROM public.pack_likes WHERE user_id = uid AND pack_id = p_pack_id;
    UPDATE public.sticker_packs SET likes_count = likes_count - 1 WHERE id = p_pack_id;
    is_liked := false;
  ELSE
    -- Like
    INSERT INTO public.pack_likes (user_id, pack_id) VALUES (uid, p_pack_id);
    UPDATE public.sticker_packs SET likes_count = likes_count + 1 WHERE id = p_pack_id;
    is_liked := true;
  END IF;
  
  SELECT likes_count INTO new_count FROM public.sticker_packs WHERE id = p_pack_id;
  
  RETURN jsonb_build_object('liked', is_liked, 'count', new_count);
END;
$$;
