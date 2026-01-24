-- Kloze Stickers - Complete Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  credits INTEGER DEFAULT 3,  -- Free daily credits
  is_pro BOOLEAN DEFAULT FALSE,
  last_credit_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sticker Packs table
CREATE TABLE IF NOT EXISTS sticker_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  publisher TEXT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  creator_name TEXT NOT NULL,
  creator_avatar TEXT,
  cover_image_url TEXT NOT NULL,
  tray_image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE,
  downloads INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stickers table
CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID REFERENCES sticker_packs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  emojis TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User generated stickers (AI üretilen)
CREATE TABLE IF NOT EXISTS user_stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  prompt TEXT NOT NULL,
  seed INTEGER,
  width INTEGER DEFAULT 512,
  height INTEGER DEFAULT 512,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft packs (henüz publish edilmemiş)
CREATE TABLE IF NOT EXISTS draft_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stickers JSONB NOT NULL,  -- Sticker array (JSON)
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions (analytics için)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- Pozitif = ekleme, negatif = çıkarma
  type TEXT NOT NULL CHECK (type IN ('add', 'deduct')),
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes (performans için)
CREATE INDEX IF NOT EXISTS idx_sticker_packs_category ON sticker_packs(category);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_downloads ON sticker_packs(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_creator ON sticker_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_stickers_pack_id ON stickers(pack_id);
CREATE INDEX IF NOT EXISTS idx_stickers_order ON stickers(pack_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_stickers_user ON user_stickers(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_packs_user ON draft_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id);

-- Download count artırma fonksiyonu
CREATE OR REPLACE FUNCTION increment_downloads(pack_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sticker_packs
  SET downloads = downloads + 1
  WHERE id = pack_id;
END;
$$ LANGUAGE plpgsql;

-- Günlük credit reset fonksiyonu
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET
    credits = 3,
    last_credit_reset = NOW()
  WHERE
    is_pro = FALSE
    AND last_credit_reset < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) Policies

-- Users: Herkes kendi verisini görebilir
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Sticker Packs: Herkes görebilir, sadece sahibi silebilir
ALTER TABLE sticker_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view packs"
ON sticker_packs FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create packs"
ON sticker_packs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners can delete packs"
ON sticker_packs FOR DELETE
USING (auth.uid() = creator_id);

CREATE POLICY "Owners can update packs"
ON sticker_packs FOR UPDATE
USING (auth.uid() = creator_id);

-- Stickers: Pack sahibi yönetebilir
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stickers"
ON stickers FOR SELECT
USING (true);

CREATE POLICY "Pack owners can manage stickers"
ON stickers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM sticker_packs
    WHERE sticker_packs.id = stickers.pack_id
    AND sticker_packs.creator_id = auth.uid()
  )
);

-- User Stickers: Sadece sahibi görebilir
ALTER TABLE user_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stickers"
ON user_stickers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own stickers"
ON user_stickers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stickers"
ON user_stickers FOR DELETE
USING (auth.uid() = user_id);

-- Draft Packs: Sadece sahibi görebilir
ALTER TABLE draft_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own drafts"
ON draft_packs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own drafts"
ON draft_packs FOR ALL
USING (auth.uid() = user_id);

-- Credit Transactions: Sadece sahibi görebilir
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON credit_transactions FOR SELECT
USING (auth.uid() = user_id);

-- Sample data (testing için)
-- INSERT INTO users (email, name, credits, is_pro) VALUES
-- ('test@example.com', 'Test User', 10, false);

-- Cron job (günlük credit reset için)
-- Bu Supabase dashboard'dan pg_cron ile ayarlanabilir:
-- SELECT cron.schedule('reset-daily-credits', '0 0 * * *', 'SELECT reset_daily_credits();');
