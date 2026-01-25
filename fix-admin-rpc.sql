-- FIX: Update admin_add_credits to use reliable JWT email check

CREATE OR REPLACE FUNCTION admin_add_credits(target_user_id UUID, amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_email TEXT;
BEGIN
  -- Get email from JWT (More reliable in RLS/Security Definer context)
  SELECT auth.jwt() ->> 'email' INTO caller_email;
  
  -- Hardcoded Admin Check
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
