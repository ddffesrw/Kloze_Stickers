-- BYPASS RLS WITH SECURITY DEFINER FUNCTION
-- usage: supabase.rpc('get_user_credits')

CREATE OR REPLACE FUNCTION get_user_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges, bypassing RLS
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  -- Get credits for the calling user
  SELECT credits INTO current_credits 
  FROM public.users 
  WHERE id = auth.uid();
  
  RETURN COALESCE(current_credits, 0);
END;
$$;
