# 🚀 Kloze Stickers - Kurulum Talimatları

## 1️⃣ Bağımlılıkları Yükle

```bash
# Supabase client kütüphanesini yükle
npm install @supabase/supabase-js

# veya yarn kullanıyorsanız
yarn add @supabase/supabase-js

# veya bun kullanıyorsanız
bun add @supabase/supabase-js
```

## 2️⃣ Environment Variables Ayarla

`.env` dosyası oluştur ve Supabase credentials'ını ekle:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Not:** Supabase projesini [supabase.com](https://supabase.com) üzerinden oluştur ve credentials'ı buradan al.

## 3️⃣ Supabase Database Schema Oluştur

Supabase SQL Editor'de aşağıdaki SQL'i çalıştır:

```sql
-- Users tablosu
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  credits INTEGER DEFAULT 0,
  is_pro BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sticker Packs tablosu
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

-- Stickers tablosu
CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pack_id UUID REFERENCES sticker_packs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  emojis TEXT[] DEFAULT '{}',
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Download count artırma fonksiyonu
CREATE OR REPLACE FUNCTION increment_downloads(pack_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE sticker_packs
  SET downloads = downloads + 1
  WHERE id = pack_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes (performans için)
CREATE INDEX IF NOT EXISTS idx_sticker_packs_category ON sticker_packs(category);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_downloads ON sticker_packs(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_sticker_packs_creator ON sticker_packs(creator_id);
CREATE INDEX IF NOT EXISTS idx_stickers_pack_id ON stickers(pack_id);
CREATE INDEX IF NOT EXISTS idx_stickers_order ON stickers(pack_id, order_index);
```

## 4️⃣ Supabase Storage Buckets Oluştur

Supabase Dashboard → Storage bölümünden:

1. **`stickers`** bucket'ı oluştur (Public)
2. **`tray-icons`** bucket'ı oluştur (Public)
3. **`cover-images`** bucket'ı oluştur (Public)

### Storage Policy Ayarları

Her bucket için aşağıdaki policy'leri ekle:

```sql
-- Public okuma erişimi
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'stickers' );

-- Authenticated kullanıcılar yükleyebilir
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'stickers' AND auth.role() = 'authenticated' );
```

## 5️⃣ Android Kurulum

### MainActivity.kt Güncelle

`android/app/src/main/java/.../MainActivity.kt` dosyasını aç:

```kotlin
package app.lovable.d7685d6b5c3346488a767907e61fa87e

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import app.lovable.kloze.WhatsAppStickersPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // WhatsApp Stickers Plugin'i kaydet
        registerPlugin(WhatsAppStickersPlugin::class.java)
    }
}
```

### AndroidManifest.xml Kontrol Et

`android/app/src/main/AndroidManifest.xml` dosyasında WhatsApp query permission'ı olmalı:

```xml
<manifest>
    <!-- ... -->

    <queries>
        <package android:name="com.whatsapp" />
    </queries>
</manifest>
```

## 6️⃣ iOS Kurulum (Opsiyonel)

### Info.plist Güncelle

`ios/App/App/Info.plist` dosyasına ekle:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>whatsapp</string>
</array>
```

### Plugin'i Kaydet

Capacitor otomatik olarak Swift plugin'leri tanır, ekstra adım gerekmez.

## 7️⃣ Capacitor Sync

```bash
npx cap sync
```

Bu komut:
- Web build'ini `dist/` klasörüne kopyalar
- Native plugin'leri Android/iOS projelerine ekler
- Gerekli konfigürasyonları günceller

## 8️⃣ Test Et

### Android'de Test
```bash
# Emulator veya gerçek cihazda çalıştır
npx cap run android

# Veya Android Studio'dan Run et
npx cap open android
```

### iOS'ta Test
```bash
# Simulator veya gerçek cihazda çalıştır
npx cap run ios

# Veya Xcode'dan Run et
npx cap open ios
```

## 9️⃣ Build

### Development Build
```bash
npm run build:dev
npx cap sync
```

### Production Build
```bash
npm run build
npx cap sync
```

## 🎨 Runware.ai Entegrasyonu (Opsiyonel)

Eğer AI ile sticker üretimi yapacaksanız:

```bash
# Runware SDK'yı yükle
npm install @runware/sdk-js

# .env dosyasına ekle
VITE_RUNWARE_API_KEY=your-api-key-here
```

## 🧪 Test Senaryoları

### 1. WhatsApp Entegrasyonu Test
1. Uygulamayı aç
2. Bir sticker pack'e tıkla
3. "WhatsApp" butonuna bas
4. WhatsApp'ın açıldığını ve paket ekleme ekranını görmeli

### 2. Supabase Bağlantı Test
1. Ana sayfayı aç
2. Console'da hata olmamalı
3. Sticker pack'leri görmelisin

### 3. Offline Test
1. İnterneti kapat
2. Uygulamayı aç
3. Uygun hata mesajı görmeli

## 📱 Canlıya Alma

### Android (Google Play)
1. `android/app/build.gradle` dosyasında version güncelle
2. Signing key oluştur
3. Release APK/AAB oluştur:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

### iOS (App Store)
1. Xcode'da version güncelle
2. Provisioning profile ayarla
3. Archive oluştur ve upload et

## 🆘 Sorun Giderme

### "Supabase credentials not found"
- `.env` dosyasını kontrol et
- Environment variables doğru mu?
- Server'ı yeniden başlat

### "WhatsApp plugin not found"
- `npx cap sync` çalıştırdın mı?
- MainActivity.kt'de plugin kayıtlı mı?
- Android build temiz mi? (`./gradlew clean`)

### "Storage permission denied"
- AndroidManifest.xml'de permission'lar var mı?
- Android 11+ için MANAGE_EXTERNAL_STORAGE gerekebilir

## 📚 Kaynaklar

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [WhatsApp Stickers API](https://faq.whatsapp.com/general/how-to-create-stickers-for-whatsapp)
- [Runware.ai Docs](https://docs.runware.ai)

---

**Tebrikler!** 🎉 Artık Kloze Stickers uygulamanız hazır!
