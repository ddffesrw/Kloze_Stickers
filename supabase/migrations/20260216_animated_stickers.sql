-- Add is_animated column to user_stickers table
-- This tracks whether a sticker is animated WebP or static
-- Animated stickers have different size limits (500KB vs 100KB)

ALTER TABLE user_stickers
ADD COLUMN IF NOT EXISTS is_animated BOOLEAN DEFAULT FALSE;

-- Add index for filtering animated stickers
CREATE INDEX IF NOT EXISTS idx_user_stickers_animated
ON user_stickers(is_animated)
WHERE is_animated = TRUE;

-- Add comment
COMMENT ON COLUMN user_stickers.is_animated IS
'Indicates if sticker is animated WebP (true) or static (false). Animated stickers support up to 500KB, static up to 100KB.';
