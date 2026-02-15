-- Add featured flag and display_downloads to sticker_packs
-- is_featured: marks packs to appear in trending/featured section
-- display_downloads: fake/override download count shown to users (null = use real downloads)

ALTER TABLE sticker_packs ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE sticker_packs ADD COLUMN IF NOT EXISTS display_downloads INTEGER DEFAULT NULL;

-- Index for efficient featured pack queries
CREATE INDEX IF NOT EXISTS idx_sticker_packs_featured ON sticker_packs (is_featured) WHERE is_featured = TRUE;
