-- MASTER BACKEND SETUP SCRIPT for Kloze Stickers
-- Run this script to ensure all tables, functions, and policies are present.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  credits INTEGER DEFAULT 10,
  is_pro BOOLEAN DEFAULT FALSE,
  last_claim_date TIMESTAMP WITH TIME ZONE,
  last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sticker Packs
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  publisher TEXT DEFAULT 'Kloze User',
  tray_image_url TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloads INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT FALSE,
  category TEXT DEFAULT 'General'
);

-- User Stickers (Generated or Drafts)
CREATE TABLE IF NOT EXISTS public.user_stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  seed INTEGER,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  size_bytes BIGINT DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

-- Credit Transactions (Log)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'add' | 'deduct'
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pack Likes
CREATE TABLE IF NOT EXISTS public.pack_likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

-- 3. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('thumbnails', 'thumbnails', true) ON CONFLICT (id) DO NOTHING;

-- 4. FUNCTIONS (RPCs)

-- Deduct Credits
CREATE OR REPLACE FUNCTION deduct_credits(amount INT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_credits INT;
  uid UUID;
BEGIN
  uid := auth.uid();
  SELECT credits INTO current_credits FROM public.users WHERE id = uid FOR UPDATE;
  
  IF current_credits < amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz bakiye');
  END IF;
  
  UPDATE public.users SET credits = credits - amount WHERE id = uid;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, amount, 'deduct', 'Usage');
  
  RETURN jsonb_build_object('success', true, 'remaining', current_credits - amount);
END;
$$;

-- Claim Daily Bonus
CREATE OR REPLACE FUNCTION claim_daily_bonus()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_last_claim TIMESTAMP WITH TIME ZONE;
  uid UUID;
BEGIN
  uid := auth.uid();
  SELECT last_claim_date INTO current_last_claim FROM public.users WHERE id = uid FOR UPDATE;
  
  IF current_last_claim IS NOT NULL AND current_last_claim > (NOW() - INTERVAL '24 hours') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Already claimed today');
  END IF;
  
  UPDATE public.users 
  SET credits = credits + 3, last_claim_date = NOW()
  WHERE id = uid;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, 3, 'add', 'Daily Bonus');
  
  RETURN jsonb_build_object('success', true, 'message', 'Bonus claimed!');
END;
$$;

-- Reward Ad Credits
CREATE OR REPLACE FUNCTION reward_ad_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
BEGIN
  uid := auth.uid();
  UPDATE public.users SET credits = credits + 2 WHERE id = uid;
  
  INSERT INTO credit_transactions (user_id, amount, type, reason)
  VALUES (uid, 2, 'add', 'Watch Ad Reward');
  
  RETURN jsonb_build_object('success', true, 'message', '+2 Credits added');
END;
$$;

-- Increment Downloads
CREATE OR REPLACE FUNCTION increment_downloads(pack_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.sticker_packs SET downloads = downloads + 1 WHERE id = pack_uuid;
END;
$$;

-- Toggle Pack Like
CREATE OR REPLACE FUNCTION toggle_pack_like(p_pack_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid UUID;
  is_liked BOOLEAN;
  new_count INT;
BEGIN
  uid := auth.uid();
  
  -- Check if exists
  IF EXISTS (SELECT 1 FROM public.pack_likes WHERE user_id = uid AND pack_id = p_pack_id) THEN
    -- Unlike
    DELETE FROM public.pack_likes WHERE user_id = uid AND pack_id = p_pack_id;
    UPDATE public.sticker_packs SET likes_count = likes_count - 1 WHERE id = p_pack_id;
    is_liked := false;
  ELSE
    -- Like
    INSERT INTO public.pack_likes (user_id, pack_id) VALUES (uid, p_pack_id);
    UPDATE public.sticker_packs SET likes_count = likes_count + 1 WHERE id = p_pack_id;
    is_liked := true;
  END IF;
  
  SELECT likes_count INTO new_count FROM public.sticker_packs WHERE id = p_pack_id;
  
  RETURN jsonb_build_object('liked', is_liked, 'count', new_count);
END;
$$;

-- 5. TRIGGERS

-- Auto Create Profile
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url, credits)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'Kloze User'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    10 -- Default credits
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. RLS POLICIES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_likes ENABLE ROW LEVEL SECURITY;

-- Users
DROP POLICY IF EXISTS "Users view own" ON public.users;
CREATE POLICY "Users view own" ON public.users FOR SELECT USING (auth.uid() = id);

-- Stickers
DROP POLICY IF EXISTS "Users view own stickers" ON public.user_stickers;
CREATE POLICY "Users view own stickers" ON public.user_stickers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own stickers" ON public.user_stickers;
CREATE POLICY "Users insert own stickers" ON public.user_stickers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users delete own stickers" ON public.user_stickers;
CREATE POLICY "Users delete own stickers" ON public.user_stickers FOR DELETE USING (auth.uid() = user_id);

-- Packs
DROP POLICY IF EXISTS "Users view own packs" ON public.sticker_packs;
CREATE POLICY "Users view own packs" ON public.sticker_packs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert own packs" ON public.sticker_packs;
CREATE POLICY "Users insert own packs" ON public.sticker_packs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read for packs (Marketplace)
DROP POLICY IF EXISTS "Anyone can view packs" ON public.sticker_packs;
CREATE POLICY "Anyone can view packs" ON public.sticker_packs FOR SELECT USING (true);

-- Transactions
DROP POLICY IF EXISTS "Users view own transactions" ON public.credit_transactions;
CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);

-- Likes
DROP POLICY IF EXISTS "Public view likes" ON public.pack_likes;
CREATE POLICY "Public view likes" ON public.pack_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users toggle own likes" ON public.pack_likes;
CREATE POLICY "Users toggle own likes" ON public.pack_likes FOR ALL USING (auth.uid() = user_id);

-- Storage Policies
-- Stickers Bucket
CREATE POLICY "Public Read Stickers" ON storage.objects FOR SELECT USING ( bucket_id = 'stickers' );
CREATE POLICY "Auth Upload Stickers" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'stickers' AND auth.role() = 'authenticated' );
-- Thumbnails Bucket
CREATE POLICY "Public Read Thumbnails" ON storage.objects FOR SELECT USING ( bucket_id = 'thumbnails' );
CREATE POLICY "Auth Upload Thumbnails" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'thumbnails' AND auth.role() = 'authenticated' );

