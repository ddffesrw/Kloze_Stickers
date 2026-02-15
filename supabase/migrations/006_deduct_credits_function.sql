-- Migration: Recreate deduct_credits function
-- Created: 2026-02-05
-- Purpose: Safely deduct credits from user profile using auth.uid()
-- Note: DROP first because existing function has a different return type

DROP FUNCTION IF EXISTS deduct_credits(integer);

CREATE OR REPLACE FUNCTION deduct_credits(amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET credits = GREATEST(COALESCE(credits, 0) - amount, 0),
      updated_at = NOW()
  WHERE id = auth.uid()
    AND COALESCE(credits, 0) >= amount;

  -- Raise exception if no rows were updated (insufficient credits)
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yetersiz kredi';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
