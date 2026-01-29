-- FIX GLOBAL RLS POLICIES
-- This script ensures users can read/update their own data without 403 errors.

-- 1. RESET POLICIES ON USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop all strict/broken policies
DROP POLICY IF EXISTS "Users view own" ON public.users;
DROP POLICY IF EXISTS "Users update own" ON public.users;
DROP POLICY IF EXISTS "Enable read access for own user" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- 2. CREATE PERMISSIVE POLICIES
-- Allow users to see their own profile
CREATE POLICY "Users view own" ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Allow users to update their own profile (credits, etc via RPC mainly, but safe to have)
CREATE POLICY "Users update own" ON public.users
FOR UPDATE
USING (auth.uid() = id);

-- 3. FIX STORAGE POLICIES
-- Allow public read of generated stickers
DROP POLICY IF EXISTS "Public Read Stickers" ON storage.objects;
CREATE POLICY "Public Read Stickers" ON storage.objects FOR SELECT USING ( bucket_id = 'stickers' );

-- Allow authenticated upload
DROP POLICY IF EXISTS "Auth Upload Stickers" ON storage.objects;
CREATE POLICY "Auth Upload Stickers" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'stickers' AND auth.role() = 'authenticated' );

-- 4. FIX USER_STICKERS POLICIES (CRITICAL)
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own stickers" ON public.user_stickers;
CREATE POLICY "Users view own stickers" ON public.user_stickers FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own stickers" ON public.user_stickers;
CREATE POLICY "Users insert own stickers" ON public.user_stickers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own stickers" ON public.user_stickers;
CREATE POLICY "Users delete own stickers" ON public.user_stickers FOR DELETE USING (auth.uid() = user_id);
