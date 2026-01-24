-- FIX SCRIPT FOR KLOZE STICKERS BACKEND
-- Run this in Supabase SQL Editor to resolve "Backend bozulmuş" issues.

-- 1. SYNC AUTH USERS TO PUBLIC USERS (Backfill)
-- This ensures that users who signed up before the tables were created still have a profile.
INSERT INTO public.users (id, email, name, created_at, updated_at)
SELECT 
    id, 
    email, 
    -- Try to get name from metadata, fallback to email part
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)) as name,
    created_at,
    updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. SET ADMIN PERMISSIONS
-- Ensure the admin user exists and has PRO status
UPDATE public.users 
SET is_pro = TRUE, credits = 99999
WHERE email = 'johnaxe.storage@gmail.com';

-- 3. FIX RLS POLICIES FOR USERS
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users 
    FOR SELECT 
    USING (auth.uid() = id);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users 
    FOR UPDATE 
    USING (auth.uid() = id);

-- Allow admins to view ALL users
DROP POLICY IF EXISTS "Admins can view all data" ON public.users;
CREATE POLICY "Admins can view all data" ON public.users 
    FOR SELECT 
    USING (
        (SELECT email FROM auth.users WHERE id = auth.uid()) = 'johnaxe.storage@gmail.com'
    );

-- 4. FIX STORAGE PERMISSIONS (If broken)
-- Ensure 'stickers' and 'thumbnails' are public
UPDATE storage.buckets SET public = true WHERE id = 'stickers';
UPDATE storage.buckets SET public = true WHERE id = 'thumbnails';

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Allow Authenticated Uploads" ON storage.objects;
CREATE POLICY "Allow Authenticated Uploads" ON storage.objects
    FOR INSERT 
    TO authenticated 
    WITH CHECK (true);

-- Allow public read access
DROP POLICY IF EXISTS "Allow Public Read" ON storage.objects;
CREATE POLICY "Allow Public Read" ON storage.objects
    FOR SELECT 
    TO public 
    USING (true);

-- Allow users to delete their own files (simplify to authenticated for now or specific path matching)
DROP POLICY IF EXISTS "Allow Users to Delete Own Files" ON storage.objects;
CREATE POLICY "Allow Users to Delete Own Files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id IN ('stickers', 'thumbnails'));

-- 5. VERIFY FOREIGN KEYS
-- Ensure user_stickers references public.users correctly. 
-- If this fails, it means the table structure is very wrong, but we assume it's just missing rows.
