-- 1. Create Users Table (if not exists)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  credits INTEGER DEFAULT 10, -- Updated default
  is_pro BOOLEAN DEFAULT FALSE,
  last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create User Stickers Table
CREATE TABLE IF NOT EXISTS public.user_stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  seed INTEGER,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  pack_id UUID, -- Will define FK later if pack table exists
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  size_bytes BIGINT DEFAULT 0, -- Quality Update
  sort_order INTEGER DEFAULT 0 -- Quality Update
);

-- 3. Create Sticker Packs Table
CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL, -- "name" in some schemas, let's support both or pick one. Code uses "title" in UI but "name" in DB? 
  -- ProfilePage.tsx uses pack.title. stickerService.ts interface says title.
  -- Let's stick to title? Or add name alias?
  -- Wait, previous schema said "name". I should check stickerService.ts again. 
  -- Service returns "title".
  -- I'll use title here.
  publisher TEXT,
  tray_image_url TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  downloads INTEGER DEFAULT 0
);

-- Fix user_stickers FK to packs now that table exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_stickers_pack_id_fkey') THEN
    ALTER TABLE public.user_stickers ADD CONSTRAINT user_stickers_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.sticker_packs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Credit System RPC
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
  
  -- Get current credits
  SELECT credits INTO current_credits FROM public.users WHERE id = uid FOR UPDATE;
  
  IF current_credits < amount THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yetersiz bakiye');
  END IF;
  
  -- Deduct
  UPDATE public.users 
  SET credits = credits - amount 
  WHERE id = uid;
  
  RETURN jsonb_build_object('success', true, 'remaining', current_credits - amount);
END;
$$;

-- 5. Auto-Create Profile Trigger
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
    10
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stickers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified)
CREATE POLICY "Users view own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own" ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users view own stickers" ON public.user_stickers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own stickers" ON public.user_stickers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own stickers" ON public.user_stickers FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own stickers" ON public.user_stickers FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users view own packs" ON public.sticker_packs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own packs" ON public.sticker_packs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own packs" ON public.sticker_packs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own packs" ON public.sticker_packs FOR UPDATE USING (auth.uid() = user_id);
