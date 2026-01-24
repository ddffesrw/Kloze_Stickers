# 🚀 Hızlı Kurulum Kılavuzu

## ✅ Runware API Key Eklendi!

API Key: `pIr0B8arPFAxsQ4IfY3S5JqjonKtrH6H` ✅

---

## 📋 Adım Adım Kurulum

### 1️⃣ Dependencies Yükle (2 dakika)

```bash
npm install @supabase/supabase-js @runware/sdk-js
```

### 2️⃣ Supabase Hesabı Oluştur (5 dakika)

1. [supabase.com](https://supabase.com) → Sign up
2. "New Project" → İsim ver, şifre belirle, region seç
3. Dashboard → Settings → API
4. **Copy:** `Project URL` ve `anon public` key

### 3️⃣ .env Dosyasını Güncelle (1 dakika)

`.env` dosyasını aç ve Supabase credentials'ları yapıştır:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co     # ← BURAYA YAPIŞTTIR
VITE_SUPABASE_ANON_KEY=eyJhbGc...                # ← BURAYA YAPIŞTTIR

# Runware.ai (ZATEN HAZIR!)
VITE_RUNWARE_API_KEY=pIr0B8arPFAxsQ4IfY3S5JqjonKtrH6H

# Hugging Face (OPSİYONEL - şimdilik boş bırakabilirsin)
VITE_HUGGING_FACE_TOKEN=hf_...
```

### 4️⃣ Supabase Database Setup (3 dakika)

1. Supabase Dashboard → SQL Editor
2. `supabase-schema.sql` dosyasını aç
3. Tüm SQL'i kopyala → SQL Editor'e yapıştır
4. **Run** butonuna bas

### 5️⃣ Supabase Storage Buckets (2 dakika)

Supabase Dashboard → Storage → "New Bucket":

1. `stickers` - Public ✅
2. `thumbnails` - Public ✅
3. `tray-icons` - Public ✅
4. `cover-images` - Public ✅

**Her bucket için:**
- Policies → "New Policy" → "Allow public access for SELECT"

### 6️⃣ Hugging Face Token (OPSİYONEL - 2 dakika)

**Background removal için gerekli:**

1. [huggingface.co](https://huggingface.co) → Sign up
2. Settings → Access Tokens → "New token"
3. Name: "Kloze Stickers", Type: "Read"
4. Copy token → `.env` dosyasına yapıştır

---

## 🧪 Test Et!

### Development Test:
```bash
# 1. Dev server
npm run dev

# 2. Browser'da aç
http://localhost:5173

# 3. Generate page'e git
# 4. Prompt gir: "cute cat with sunglasses"
# 5. ✅ AI sticker üretilmeli!
```

### Mobile Test:
```bash
# 1. Capacitor sync
npx cap sync

# 2. Android'de çalıştır
npx cap run android

# 3. Pack oluştur (3+ sticker)
# 4. "WhatsApp'a Ekle" butonuna bas
# 5. ✅ WhatsApp açılmalı!
```

---

## 🎯 Hızlı Checklist

- [x] ✅ Runware API Key eklendi (`.env`)
- [ ] ⏳ Supabase hesabı oluştur
- [ ] ⏳ Supabase URL + Key ekle (`.env`)
- [ ] ⏳ Dependencies yükle (`npm install`)
- [ ] ⏳ Database schema çalıştır (SQL Editor)
- [ ] ⏳ Storage buckets oluştur
- [ ] ⏳ Hugging Face token al (opsiyonel)
- [ ] ⏳ Test et (`npm run dev`)

---

## 🆘 Sorun mu var?

### "Module not found: @supabase/supabase-js"
```bash
npm install @supabase/supabase-js
```

### "Supabase credentials not found"
- `.env` dosyasını kontrol et
- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` dolu mu?
- Server'ı yeniden başlat: `npm run dev`

### "Runware API error"
- `.env` dosyasında `VITE_RUNWARE_API_KEY` doğru mu?
- API key'de tırnak işareti olmamalı

### "Background removal failed"
- Hugging Face token gerekli
- Model ilk seferde loading olabilir (20-30 saniye)
- Auto-retry var, bekle

---

## 🎉 Hazır!

**Tüm adımlar tamamlandıktan sonra:**

1. ✅ AI ile sticker üretebilirsin
2. ✅ Background removal çalışır
3. ✅ Supabase'e otomatik upload
4. ✅ Credit system çalışır
5. ✅ WhatsApp native entegrasyonu hazır

**Şimdi `npm run dev` çalıştır ve test et!** 🚀

---

## 📚 Daha Fazla Bilgi

- **Full Dokümantasyon:** `MOTOR_READY.md`
- **Native Setup:** `NATIVE_IMPLEMENTATION_COMPLETE.md`
- **Implementation Guide:** `IMPLEMENTATION_GUIDE.md`
- **Setup Instructions:** `SETUP_INSTRUCTIONS.md`

---

**Sorular?** README'lere bak veya bana sor! 💬
