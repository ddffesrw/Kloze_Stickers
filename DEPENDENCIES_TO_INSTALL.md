# 📦 Yüklenecek Bağımlılıklar

## Hemen Yükle:

```bash
# Supabase client
npm install @supabase/supabase-js

# Runware.ai SDK
npm install @runware/sdk-js

# Bunları yükledikten sonra development başlayabilir
```

## Package.json'a Eklenecek:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@runware/sdk-js": "^1.0.0"
  }
}
```

## Environment Variables (.env dosyası):

```bash
# .env oluştur
cp .env.example .env

# Sonra credentials'ları doldur:
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key
VITE_RUNWARE_API_KEY=your-runware-key
VITE_HUGGING_FACE_TOKEN=your-hf-token
```

## Supabase Setup:

```bash
# 1. Supabase dashboard'a git
# 2. SQL Editor'de supabase-schema.sql dosyasını çalıştır
# 3. Storage buckets oluştur:
#    - stickers (public)
#    - thumbnails (public)
#    - tray-icons (public)
#    - cover-images (public)
```

## Test:

```bash
# 1. Dependencies yükle
npm install

# 2. Dev server başlat
npm run dev

# 3. Capacitor sync
npx cap sync

# 4. Android test
npx cap run android
```

---

**Hazır!** Artık motor çalışmaya hazır! 🚀
