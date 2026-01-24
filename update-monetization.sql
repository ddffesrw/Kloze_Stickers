-- RPC for Reward Ad Credits
CREATE OR REPLACE FUNCTION reward_ad_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  
  -- Add 2 credits
  UPDATE public.users 
  SET credits = credits + 2
  WHERE id = uid;
  
  -- Log Transaction
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, 2, 'add', 'Watch Ad Reward');
  
  RETURN jsonb_build_object('success', true, 'message', '+2 Credits added');
END;
$$;
