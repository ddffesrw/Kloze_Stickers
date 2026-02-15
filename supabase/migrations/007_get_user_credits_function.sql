-- Migration: Add get_user_credits function
-- Created: 2026-02-05
-- Purpose: Safely get current user's credit balance using auth.uid()
-- Called by: useUserCredits hook, useStickerGeneration hook, stickerGenerationService

DROP FUNCTION IF EXISTS get_user_credits();

CREATE OR REPLACE FUNCTION get_user_credits()
RETURNS INTEGER AS $$
DECLARE
  user_credits INTEGER;
BEGIN
  SELECT COALESCE(credits, 0) INTO user_credits
  FROM profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  RETURN user_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
