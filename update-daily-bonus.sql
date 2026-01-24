-- Add last_claim_date column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_claim_date TIMESTAMP WITH TIME ZONE;

-- RPC for Daily Bonus
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
  
  -- Check last claim
  SELECT last_claim_date INTO current_last_claim FROM public.users WHERE id = uid FOR UPDATE;
  
  -- If claimed within 24 hours
  IF current_last_claim IS NOT NULL AND current_last_claim > (NOW() - INTERVAL '24 hours') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'message', 'Already claimed today',
      'next_claim', current_last_claim + INTERVAL '24 hours'
    );
  END IF;
  
  -- Give Bonus (3 credits)
  UPDATE public.users 
  SET 
    credits = credits + 3,
    last_claim_date = NOW()
  WHERE id = uid;
  
  -- Log Transaction
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, 3, 'add', 'Daily Bonus');
  
  RETURN jsonb_build_object('success', true, 'message', 'Bonus claimed!');
END;
$$;
