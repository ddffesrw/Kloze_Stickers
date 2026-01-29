-- Add tray_image_url if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticker_packs' AND column_name='tray_image_url') THEN
        ALTER TABLE sticker_packs ADD COLUMN tray_image_url TEXT;
    END IF;
END $$;

-- Add is_premium if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sticker_packs' AND column_name='is_premium') THEN
        ALTER TABLE sticker_packs ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sticker_packs';
