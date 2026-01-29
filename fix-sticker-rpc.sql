-- BYPASS RLS FOR STICKER SAVING
-- Usage: supabase.rpc('save_user_sticker', { ...params... })

CREATE OR REPLACE FUNCTION save_user_sticker(
  p_user_id UUID,
  p_image_url TEXT,
  p_prompt TEXT,
  p_width INTEGER DEFAULT 512,
  p_height INTEGER DEFAULT 512
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as admin, bypassing RLS checks
AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO public.user_stickers (user_id, image_url, prompt, width, height, pack_id)
  VALUES (p_user_id, p_image_url, p_prompt, p_width, p_height, NULL)
  RETURNING id INTO new_id;
  
  RETURN jsonb_build_object('success', true, 'id', new_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
