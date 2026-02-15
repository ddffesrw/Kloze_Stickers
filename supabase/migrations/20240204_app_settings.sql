-- App Settings Tablosu
-- Bu tabloyu Supabase Dashboard > SQL Editor'da çalıştırın

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan ayarları ekle
INSERT INTO app_settings (key, value, description) VALUES
  ('credit_cost_per_sticker', '1', 'Sticker başına harcanan kredi miktarı'),
  ('credit_reward_per_ad', '2', 'Reklam izleme başına kazanılan kredi'),
  ('free_daily_credits', '3', 'Günlük ücretsiz kredi miktarı'),
  ('new_user_bonus_credits', '10', 'Yeni kullanıcı hoşgeldin bonusu'),
  ('min_stickers_per_pack', '3', 'Paket başına minimum sticker sayısı'),
  ('max_stickers_per_pack', '30', 'Paket başına maksimum sticker sayısı'),
  ('ads_enabled', 'true', 'Reklamlar aktif mi'),
  ('ad_cooldown_minutes', '5', 'Reklamlar arası minimum bekleme (dakika)'),
  ('max_ads_per_day', '10', 'Günlük izlenebilecek maksimum reklam sayısı'),
  ('maintenance_mode', 'false', 'Bakım modu aktif mi'),
  ('app_version_minimum', '1.0.0', 'Minimum desteklenen uygulama versiyonu')
ON CONFLICT (key) DO NOTHING;

-- RLS (Row Level Security) - Herkes okuyabilir, sadece admin yazabilir
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir
CREATE POLICY "Public can read settings" ON app_settings
  FOR SELECT USING (true);

-- Sadece belirli admin email'i yazabilir (kendi email'inizi ekleyin)
CREATE POLICY "Admin can update settings" ON app_settings
  FOR ALL USING (
    auth.email() = 'johnaxe.storage@gmail.com'
  );

-- Güncellenme zamanını otomatik güncelle
CREATE OR REPLACE FUNCTION update_app_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_timestamp();
