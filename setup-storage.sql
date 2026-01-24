-- 1. Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stickers', 'stickers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('thumbnails', 'thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create policies for 'stickers' bucket
-- Allow public read access
CREATE POLICY "Public Read Access Stickers"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stickers' );

-- Allow ANYONE to upload (for testing purposes, since we bypass Auth)
CREATE POLICY "Allow All Uploads Stickers"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'stickers' );

-- 3. Create policies for 'thumbnails' bucket
-- Allow public read access
CREATE POLICY "Public Read Access Thumbnails"
ON storage.objects FOR SELECT
USING ( bucket_id = 'thumbnails' );

-- Allow ANYONE to upload (for testing purposes)
CREATE POLICY "Allow All Uploads Thumbnails"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'thumbnails' );
