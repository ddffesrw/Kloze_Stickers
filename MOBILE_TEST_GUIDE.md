# 📱 Mobil Test Kılavuzu

## ✅ Projenin Güncel Durumu

Tüm sistemler entegre edildi ve test için hazır:

- ✅ **Native Bridge**: Android ContentProvider + iOS Pasteboard
- ✅ **AI Motor**: Runware.ai + Hugging Face + Full Pipeline
- ✅ **UI Integration**: GeneratePage + PackDetailPage motor bağlantıları
- ✅ **Credit System**: Canlı kredi göstergesi + validasyon
- ✅ **WhatsApp Button**: 3+ sticker validasyonu + native tetikleme

---

## 🔧 Test Öncesi Hazırlık

### 1️⃣ UI Dosyalarını Değiştir (2 dakika)

Entegre edilmiş sayfaları aktif hale getir:

```bash
# Orijinalleri yedekle
mv src/pages/GeneratePage.tsx src/pages/GeneratePage_OLD.tsx
mv src/pages/PackDetailPage.tsx src/pages/PackDetailPage_OLD.tsx

# Entegre versiyonları kullan
mv src/pages/GeneratePage_Integrated.tsx src/pages/GeneratePage.tsx
mv src/pages/PackDetailPage_Integrated.tsx src/pages/PackDetailPage.tsx
```

### 2️⃣ Dependencies Kontrol (1 dakika)

```bash
npm install @supabase/supabase-js @runware/sdk-js
```

### 3️⃣ .env Credentials (ZORUNLU!)

`.env` dosyasını aç ve Supabase credentials ekle:

```bash
# Supabase Configuration (DOLDUR!)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Runware.ai (ZATEN HAZIR!)
VITE_RUNWARE_API_KEY=pIr0B8arPFAxsQ4IfY3S5JqjonKtrH6H

# Hugging Face (OPSİYONEL)
VITE_HUGGING_FACE_TOKEN=hf_...
```

### 4️⃣ Supabase Setup (5 dakika)

1. **Database Schema**:
   - Supabase Dashboard → SQL Editor
   - `supabase-schema.sql` dosyasını aç
   - Tüm SQL'i kopyala → Paste → Run

2. **Storage Buckets**:
   - Supabase Dashboard → Storage → New Bucket
   - Oluştur: `stickers`, `thumbnails`, `tray-icons`, `cover-images`
   - Her bucket: Public ✅
   - Policies → "Allow public access for SELECT"

### 5️⃣ Android Plugin Kaydı (1 dakika)

`android/app/src/main/java/app/lovable/d7685d6b5c3346488a767907e61fa87e/MainActivity.kt` dosyasını aç:

```kotlin
import app.lovable.kloze.WhatsAppStickersPlugin

// onCreate() içinde:
registerPlugin(WhatsAppStickersPlugin::class.java)
```

---

## 🚀 Mobil Test Adımları

### Web Test (Hızlı Kontrol)

```bash
# 1. Dev server
npm run dev

# 2. Browser'da aç
http://localhost:5173

# 3. Test senaryoları:
# - Generate page → Kredi sayacı görünüyor mu? ✅
# - Prompt gir → Loading animasyonu çalışıyor mu? ✅
# - Sticker üretildi mi? ✅
# - Grid'e eklendi mi? ✅
# - Kredi düştü mü? ✅
```

### Android Test (Full Test)

```bash
# 1. Build web app
npm run build

# 2. Capacitor sync
npx cap sync

# 3. Android'de çalıştır (2 yöntem):

# Yöntem A: Doğrudan çalıştır
npx cap run android

# Yöntem B: Android Studio'da aç
npx cap open android
# Sonra Android Studio'dan Run
```

**İlk çalıştırmada:**
- Gradle sync bekle (1-2 dakika)
- Android emulator veya fiziksel cihaz seç
- WhatsApp'ın yüklü olduğundan emin ol

### iOS Test (Opsiyonel)

```bash
# 1. Build web app
npm run build

# 2. Capacitor sync
npx cap sync

# 3. iOS'de aç
npx cap open ios

# 4. Xcode'dan:
# - Team seç (Apple Developer Account gerekli)
# - Simülatör veya cihaz seç
# - Run
```

---

## 🧪 Test Senaryoları

### Senaryo 1: Sticker Üretimi
**Amaç**: Full pipeline test (AI → BG Remove → Upload → Credit)

1. ✅ Generate page'i aç
2. ✅ Sağ üst kredi sayacını kontrol et (başlangıç: 3)
3. ✅ Prompt gir: `"cute panda with sunglasses"`
4. ✅ "Üret" butonuna bas
5. ✅ Loading animasyonu göründü mü?
6. ✅ Progress bar göründü mü?
   - "AI ile oluşturuluyor..."
   - "Arka plan siliniyor..."
   - "Yükleniyor..."
7. ✅ Sticker üretildi ve grid'e eklendi mi?
8. ✅ Kredi 2'ye düştü mü?
9. ✅ Toast bildirim: "Sticker başarıyla oluşturuldu!"

**Beklenen Süre**: 15-30 saniye

### Senaryo 2: Credit Validasyonu
**Amaç**: Yetersiz kredi kontrolü

1. ✅ 3 kez sticker üret (0 krediye düş)
2. ✅ Kredi sayacı kırmızı oldu mu?
3. ✅ "Üret" butonu disabled oldu mu?
4. ✅ 4. sticker üretmeyi dene
5. ✅ Hata mesajı: "Yetersiz kredi!"
6. ✅ Generate butonu tıklanamıyor mu?

### Senaryo 3: Pack Validation (< 3 Sticker)
**Amaç**: WhatsApp butonu validasyonu

1. ✅ Pack detail page'e git (herhangi bir pack)
2. ✅ Pack'te 0-2 sticker varsa:
   - WhatsApp butonu disabled
   - Buton üzerinde: `WhatsApp (2/3)` gibi gösterge
   - Alert mesajı: "WhatsApp'a göndermek için en az 3 sticker gerekli"

### Senaryo 4: WhatsApp Native Bridge (3+ Sticker)
**Amaç**: Full WhatsApp entegrasyonu

**ÖNEMLİ**: WhatsApp'ın cihazda yüklü olması gerekli!

1. ✅ 3+ sticker içeren bir pack aç
2. ✅ WhatsApp butonu enabled mi?
3. ✅ "WhatsApp'a Ekle" butonuna bas
4. ✅ Progress dialog açıldı mı?
   - "Tray icon hazırlanıyor..."
   - "Sticker'lar indiriliyor..."
   - "WhatsApp'a ekleniyor..."
5. ✅ WhatsApp uygulaması açıldı mı?
6. ✅ Sticker pack'i görünüyor mu?
7. ✅ "Ekle" butonuna bas (WhatsApp'ta)
8. ✅ Pack eklendi mi?
9. ✅ Chat'te sticker'ları kullanabildin mi?

**Beklenen Süre**: 10-20 saniye

### Senaryo 5: Supabase Sync
**Amaç**: Database ve storage entegrasyonu

1. ✅ Sticker üret
2. ✅ Supabase Dashboard → Storage → `stickers` bucket
3. ✅ Yeni yüklenen .webp dosyası var mı?
4. ✅ Supabase Dashboard → Table Editor → `user_stickers`
5. ✅ Yeni kayıt eklendi mi?
6. ✅ `image_url` ve `thumbnail_url` doğru mu?

---

## 🐛 Troubleshooting

### "Module not found: @supabase/supabase-js"
```bash
npm install @supabase/supabase-js @runware/sdk-js
npm run build
npx cap sync
```

### "Supabase credentials not found"
- `.env` dosyasını kontrol et
- `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` dolu mu?
- Dev server'ı restart et: `Ctrl+C` → `npm run dev`

### "Runware API error"
- `.env` dosyasında API key doğru mu?
- API key'de tırnak işareti olmamalı
- Internet bağlantısı var mı?

### "Background removal failed"
- Hugging Face token gerekli (`.env`)
- İlk seferde model loading 20-30 saniye sürer
- Auto-retry var, bekle
- 503 error normaldir, retry mekanizması çalışıyor

### "WhatsApp not opening" (Android)
**Kontrol Listesi**:
1. WhatsApp yüklü mü? → Play Store'dan yükle
2. `npx cap sync` çalıştırıldı mı?
3. `AndroidManifest.xml` ContentProvider eklendi mi?
4. `StickerContentProvider.kt` dosyası var mı?
5. Pack'te 3+ sticker var mı?

**Fix**:
```bash
# Rebuild
npm run build
npx cap sync
# Android Studio'dan clean + rebuild
```

### "WhatsApp not opening" (iOS)
**Kontrol Listesi**:
1. WhatsApp yüklü mü?
2. `Info.plist` güncel mi?
3. `LSApplicationQueriesSchemes` ekli mi?
4. URL Scheme: `whatsapp://` ekli mi?

**Fix**:
```bash
# ios/App/App/Info.plist kontrol et
npx cap sync
npx cap open ios
```

### "Credit not updating"
- `refreshCredits()` çağrılıyor mu?
- `user_stickers` tablosuna kayıt eklendi mi?
- `deductCredits()` fonksiyonu başarılı mı?
- Console'da hata var mı?

### Gradle Sync Failed (Android)
```bash
cd android
./gradlew clean
cd ..
npx cap sync
```

### Build Failed (iOS)
- Xcode'da Team seçili mi?
- Signing certificate var mı?
- Bundle ID unique mi?
- Cocoapods güncel mi? → `pod install`

---

## 📊 Test Sonuç Checklist

### Generator Page
- [ ] ✅ Kredi sayacı görünüyor
- [ ] ✅ Kredi renk değişimi (yeşil → kırmızı)
- [ ] ✅ Loading animasyonu (Loader2 spinner)
- [ ] ✅ Progress bar (4 aşama)
- [ ] ✅ Sticker grid'e ekleniyor
- [ ] ✅ Kredi otomatik düşüyor
- [ ] ✅ Toast bildirimi
- [ ] ✅ Error handling (yetersiz kredi)

### Pack Detail Page
- [ ] ✅ Supabase'den pack çekiliyor
- [ ] ✅ WhatsApp butonu disabled (< 3 sticker)
- [ ] ✅ WhatsApp butonu enabled (3+ sticker)
- [ ] ✅ Validasyon uyarısı gösteriliyor
- [ ] ✅ Progress dialog açılıyor
- [ ] ✅ WhatsApp native açılıyor
- [ ] ✅ Pack WhatsApp'ta görünüyor

### Native Bridge
- [ ] ✅ ContentProvider (Android)
- [ ] ✅ Tray icon oluşturuluyor
- [ ] ✅ Metadata.json doğru
- [ ] ✅ Sticker'lar indirildi
- [ ] ✅ WhatsApp Intent çalıştı
- [ ] ✅ Pack eklendi

### Backend
- [ ] ✅ Runware.ai generation
- [ ] ✅ Hugging Face BG removal
- [ ] ✅ WebP conversion
- [ ] ✅ Supabase upload
- [ ] ✅ Database kayıt
- [ ] ✅ Credit deduction

---

## 🎯 Performans Metrikleri

**Beklenen Süreler**:
- Sticker generation: 15-30 saniye
- Background removal: 5-10 saniye (ilk seferde +20s model loading)
- Upload to Supabase: 1-2 saniye
- WhatsApp native: 5-10 saniye
- **Toplam (AI → WhatsApp)**: ~40-60 saniye

**Optimizasyon Fırsatları**:
- Background removal caching
- Batch upload
- Progressive loading
- WebP compression level ayarı

---

## 🚀 Production'a Hazırlık

### Pre-release Checklist
- [ ] Tüm test senaryoları geçti
- [ ] .env production credentials
- [ ] Supabase RLS policies aktif
- [ ] Pro subscription akışı test edildi
- [ ] Error tracking (Sentry vb.)
- [ ] Analytics (Posthog vb.)
- [ ] App signing (Android keystore, iOS certificate)

### Android Release Build
```bash
npm run build
npx cap sync
cd android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/
```

### iOS Release Build
```bash
npm run build
npx cap sync
npx cap open ios
# Xcode → Product → Archive
```

---

## 📚 Ek Kaynaklar

- **Detaylı API Kullanımı**: `MOTOR_READY.md`
- **Native Implementation**: `NATIVE_IMPLEMENTATION_COMPLETE.md`
- **Full Documentation**: `README_FINAL.md`
- **Quick Setup**: `QUICK_SETUP_GUIDE.md`

---

## 🎉 Başarı Kriterleri

✅ **Proje test için hazır** şu durumlarda:

1. Generator page'de sticker üretebiliyorsun
2. Kredi sistemi çalışıyor (3 → 2 → 1 → 0)
3. 0 kredide "Yetersiz kredi" hatası
4. Pack'te 3+ sticker olunca WhatsApp butonu aktif
5. WhatsApp'a bas → WhatsApp açılıyor
6. Pack ekleniyor ve kullanılabiliyor

**Hepsi çalışıyorsa: PROJE %100 HAZIR!** 🎊

---

## 💬 Destek

Sorun mu var?

1. Console log'ları kontrol et
2. Supabase Dashboard → Logs
3. Android Logcat / iOS Console
4. `MOTOR_READY.md` troubleshooting bölümü

**Test başarılar!** 🚀
