-- FIX: Update toggle_pack_like RPC to use correct 'likes_count' column

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
    -- FIX: Ensure we use 'likes_count' (plural), NOT 'like_count'
    UPDATE public.sticker_packs SET likes_count = likes_count - 1 WHERE id = p_pack_id;
    is_liked := false;
  ELSE
    -- Like
    INSERT INTO public.pack_likes (user_id, pack_id) VALUES (uid, p_pack_id);
    -- FIX: Ensure we use 'likes_count' (plural)
    UPDATE public.sticker_packs SET likes_count = likes_count + 1 WHERE id = p_pack_id;
    is_liked := true;
  END IF;
  
  SELECT likes_count INTO new_count FROM public.sticker_packs WHERE id = p_pack_id;
  
  RETURN jsonb_build_object('liked', is_liked, 'count', new_count);
END;
$$;
