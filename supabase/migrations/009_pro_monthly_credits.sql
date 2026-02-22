-- Pro monthly credits system
-- profiles is a VIEW, so we use a separate table to track monthly credit grants

CREATE TABLE IF NOT EXISTS pro_monthly_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pro_monthly_credits ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
DO $$ BEGIN
  CREATE POLICY "Users can read own monthly credits"
    ON pro_monthly_credits FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RPC: Give monthly credits to Pro user if a month has passed
-- Returns number of credits added (0 if not eligible)
CREATE OR REPLACE FUNCTION give_monthly_pro_credits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_is_pro BOOLEAN;
  v_last_given TIMESTAMPTZ;
  v_monthly_amount INTEGER := 300;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Check if Pro
  SELECT is_pro INTO v_is_pro
  FROM profiles
  WHERE id = v_user_id;

  -- Not Pro? No credits
  IF NOT COALESCE(v_is_pro, FALSE) THEN
    RETURN 0;
  END IF;

  -- Check when credits were last given
  SELECT last_given_at INTO v_last_given
  FROM pro_monthly_credits
  WHERE user_id = v_user_id;

  -- Never given? Insert and grant
  IF NOT FOUND THEN
    INSERT INTO pro_monthly_credits (user_id, last_given_at)
    VALUES (v_user_id, NOW());

    UPDATE profiles
    SET credits = credits + v_monthly_amount
    WHERE id = v_user_id;

    RETURN v_monthly_amount;
  END IF;

  -- More than 30 days since last grant?
  IF v_last_given < NOW() - INTERVAL '30 days' THEN
    UPDATE pro_monthly_credits
    SET last_given_at = NOW()
    WHERE user_id = v_user_id;

    UPDATE profiles
    SET credits = credits + v_monthly_amount
    WHERE id = v_user_id;

    RETURN v_monthly_amount;
  END IF;

  -- Already given this month
  RETURN 0;
END;
$$;
