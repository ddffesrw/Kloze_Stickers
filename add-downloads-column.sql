-- Add downloads column to sticker_packs table
ALTER TABLE public.sticker_packs 
ADD COLUMN IF NOT EXISTS downloads INTEGER DEFAULT 0;

-- Optional: Create an index for faster sorting by downloads
CREATE INDEX IF NOT EXISTS idx_sticker_packs_downloads ON public.sticker_packs(downloads DESC);

-- Grant permissions just in case (though usually added columns inherit table perms)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sticker_packs TO anon, authenticated, service_role;
