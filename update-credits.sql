-- 1. Update default credits to 10
ALTER TABLE users 
ALTER COLUMN credits SET DEFAULT 10;

-- 2. Create RPC function to deduct credits safely
CREATE OR REPLACE FUNCTION deduct_credits(amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INT;
  user_id UUID;
BEGIN
  user_id := auth.uid();
  
  -- Get current credits
  SELECT credits INTO current_credits FROM users WHERE id = user_id FOR UPDATE;
  
  IF current_credits < amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz bakiye');
  END IF;
  
  -- Deduct
  UPDATE users 
  SET credits = credits - amount 
  WHERE id = user_id;
  
  -- Log transaction (optional but good)
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (user_id, amount, 'deduct', 'Sticker generation');
  
  RETURN jsonb_build_object('success', true, 'remaining', current_credits - amount);
END;
$$;

-- 3. Create Trigger to create public.users profile on auth.signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, credits)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Kloze User'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    10 -- Default credits
  );
  RETURN new;
END;
$$;

-- Drop trigger if exists to avoid duplication errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
