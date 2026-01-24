-- Admin Functions for User Management

-- 1. Add Credits (Admin Only)
CREATE OR REPLACE FUNCTION admin_add_credits(target_user_id UUID, amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_uid UUID;
  caller_email TEXT;
BEGIN
  caller_uid := auth.uid();
  SELECT email INTO caller_email FROM auth.users WHERE id = caller_uid;
  
  -- Hardcoded Admin Check (Simple & Safe for this project)
  IF caller_email != 'johnaxe.storage@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  UPDATE public.users 
  SET credits = credits + amount 
  WHERE id = target_user_id;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (target_user_id, amount, 'add', 'Admin Gift');
  
  RETURN jsonb_build_object('success', true, 'message', 'Credits added');
END;
$$;

-- 2. Toggle Pro (Admin Only)
CREATE OR REPLACE FUNCTION admin_toggle_pro(target_user_id UUID, status BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_uid UUID;
  caller_email TEXT;
BEGIN
  caller_uid := auth.uid();
  SELECT email INTO caller_email FROM auth.users WHERE id = caller_uid;
  
  IF caller_email != 'johnaxe.storage@gmail.com' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  UPDATE public.users 
  SET is_pro = status 
  WHERE id = target_user_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Pro status updated');
END;
$$;

-- 3. Get All Users (Admin Only - Bypasses RLS)
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  credits INT,
  is_pro BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_email TEXT;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO caller_email;
  
  -- Hardcoded Admin Check
  IF caller_email != 'johnaxe.storage@gmail.com' THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY 
  SELECT u.id, u.email, u.name, u.avatar_url, u.credits, u.is_pro, u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;
