-- Add is_premium column to sticker_packs table
ALTER TABLE sticker_packs 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;

-- Add publisher column to sticker_packs table
ALTER TABLE sticker_packs 
ADD COLUMN IF NOT EXISTS publisher TEXT DEFAULT 'Kloze Official';

-- Comments
COMMENT ON COLUMN sticker_packs.is_premium IS 'Indicates if the pack is for premium users only';
COMMENT ON COLUMN sticker_packs.publisher IS 'Name of the publisher/creator to display';
