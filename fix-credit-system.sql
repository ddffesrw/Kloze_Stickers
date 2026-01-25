-- FIX: Consolidate Credit System Schema & Functions
-- This script repairs the credit_transactions table and updates all related functions.

-- 1. Fix Table Schema
DO $$
BEGIN
    -- Check if 'transaction_type' exists and rename it to 'type'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_transactions' AND column_name='transaction_type') THEN
        ALTER TABLE public.credit_transactions RENAME COLUMN transaction_type TO type;
    -- If 'type' does not exist (and we didn't just rename it), add it
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='credit_transactions' AND column_name='type') THEN
        ALTER TABLE public.credit_transactions ADD COLUMN type TEXT DEFAULT 'general';
    END IF;
END $$;

-- Ensure RLS on credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own transactions" ON public.credit_transactions;
CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);


-- 2. Update Functions (RPCs) to match schema

-- A. Admin Add Credits
CREATE OR REPLACE FUNCTION admin_add_credits(target_user_id UUID, amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  caller_email TEXT;
BEGIN
  -- Secure Admin Check via JWT
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
