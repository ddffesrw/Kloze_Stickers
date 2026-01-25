-- FORCE FIX: Add columns directly and recreate functions
-- Run this script to guarantee columns exist.

-- 1. Force Add Columns (Safe if exists)
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';
ALTER TABLE public.credit_transactions ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Unknown';

-- 2. Drop old functions to ensure clean slate
DROP FUNCTION IF EXISTS admin_add_credits(UUID, INT);
DROP FUNCTION IF EXISTS deduct_credits(INT);
DROP FUNCTION IF EXISTS claim_daily_bonus();
DROP FUNCTION IF EXISTS reward_ad_credits();

-- 3. Recreate Functions (RPCs) matching new columns

-- A. Admin Add Credits
CREATE OR REPLACE FUNCTION admin_add_credits(target_user_id UUID, amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_email TEXT;
BEGIN
  SELECT auth.jwt() ->> 'email' INTO caller_email;
  
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

-- B. Deduct Credits
CREATE OR REPLACE FUNCTION deduct_credits(amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INT;
  uid UUID;
BEGIN
  uid := auth.uid();
  SELECT credits INTO current_credits FROM public.users WHERE id = uid FOR UPDATE;
  
  IF current_credits < amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz bakiye');
  END IF;
  
  UPDATE public.users SET credits = credits - amount WHERE id = uid;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, amount, 'deduct', 'Usage');
  
  RETURN jsonb_build_object('success', true, 'remaining', current_credits - amount);
END;
$$;

-- C. Claim Daily Bonus
CREATE OR REPLACE FUNCTION claim_daily_bonus()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_last_claim TIMESTAMP WITH TIME ZONE;
  uid UUID;
BEGIN
  uid := auth.uid();
  SELECT last_claim_date INTO current_last_claim FROM public.users WHERE id = uid FOR UPDATE;
  
  IF current_last_claim IS NOT NULL AND current_last_claim > (NOW() - INTERVAL '24 hours') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today');
  END IF;
  
  UPDATE public.users 
  SET credits = credits + 3, last_claim_date = NOW()
  WHERE id = uid;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, 3, 'add', 'Daily Bonus');
  
  RETURN jsonb_build_object('success', true, 'message', 'Bonus claimed!');
END;
$$;

-- D. Reward Ad Credits
CREATE OR REPLACE FUNCTION reward_ad_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  UPDATE public.users SET credits = credits + 2 WHERE id = uid;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, 2, 'add', 'Watch Ad Reward');
  
  RETURN jsonb_build_object('success', true, 'message', '+2 Credits added');
END;
$$;
