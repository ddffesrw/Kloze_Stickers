-- Add is_premium column to sticker_packs table
ALTER TABLE sticker_packs 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Notify that this column is for monetization
COMMENT ON COLUMN sticker_packs.is_premium IS 'Indicates if the pack is for premium users only';
