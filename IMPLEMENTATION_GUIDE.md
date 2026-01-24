# 🎨 Kloze Stickers - Uygulama Kılavuzu

## 🧠 Proje Mimarisi

```
┌─────────────────────────────────────────────────────┐
│                   React UI (Lovable)                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Runware.ai  │  │ Hugging Face │  │  Supabase │ │
│  │  (Generate)  │  │ (BG Remove)  │  │ (Storage) │ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                                                      │
├─────────────────────────────────────────────────────┤
│              Capacitor (Native Bridge)               │
├─────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌──────────────────────┐  │
│  │  Android (Kotlin)  │  │    iOS (Swift)       │  │
│  │  WhatsApp Plugin   │  │  WhatsApp Plugin     │  │
│  └────────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
                   WhatsApp App
```

---

## 📦 1. Sticker Üretim İş Akışı

### Adım 1: Kullanıcı Prompt Girer
```tsx
// GeneratePage.tsx
const handleGenerate = async (prompt: string) => {
  // Runware.ai ile görsel üret
  const imageUrl = await generateSticker(prompt);

  // Arka planı sil
  const transparentUrl = await removeBackground(imageUrl);

  // WebP formatına çevir ve optimize et
  const webpUrl = await convertToWebP(transparentUrl);

  // Supabase'e yükle
  const savedUrl = await uploadToSupabase(webpUrl);

  return savedUrl;
};
```

### Adım 2: Runware.ai ile Görsel Üretimi

```typescript
// src/services/runwareService.ts
import { Runware } from '@runware/sdk-js';

const runware = new Runware({
  apiKey: import.meta.env.VITE_RUNWARE_API_KEY
});

export async function generateSticker(prompt: string): Promise<string> {
  const result = await runware.imageInference({
    model: 'flux-schnell', // veya 'flux-dev'
    prompt: `${prompt}, sticker style, vibrant colors, simple background`,
    negativePrompt: 'complex background, realistic, photo',
    width: 512,
    height: 512,
    numberResults: 1,
    outputFormat: 'PNG',
    seed: Math.floor(Math.random() * 1000000)
  });

  return result.data[0].imageURL;
}
```

### Adım 3: Arka Plan Silme (Hugging Face)

```typescript
// src/services/backgroundRemovalService.ts
export async function removeBackground(imageUrl: string): Promise<Blob> {
  const API_URL = 'https://api-inference.huggingface.co/models/briaai/RMBG-1.4';
  const HF_TOKEN = import.meta.env.VITE_HUGGING_FACE_TOKEN;

  // Resmi fetch et
  const response = await fetch(imageUrl);
  const blob = await response.blob();

  // Hugging Face API'ye gönder
  const result = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`,
      'Content-Type': 'image/png'
    },
    body: blob
  });

  return await result.blob();
}
```

### Adım 4: WebP Formatına Çevirme

```typescript
// src/services/imageProcessing.ts
export async function convertToWebP(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      // WhatsApp için 512x512 boyuta ölçeklendir
      canvas.width = 512;
      canvas.height = 512;

      // Resmi ortala ve çiz
      const scale = Math.max(512 / img.width, 512 / img.height);
      const x = (512 - img.width * scale) / 2;
      const y = (512 - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // WebP olarak export et (quality: 0.85 = 100-200KB arası)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP dönüşümü başarısız'));
          }
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
```

### Adım 5: Supabase'e Yükleme

```typescript
// src/services/stickerUploadService.ts
import { supabase, storage } from '@/lib/supabase';

export async function uploadStickerToSupabase(
  blob: Blob,
  packId: string,
  index: number
): Promise<string> {
  const fileName = `${packId}/sticker_${index}.webp`;

  // Upload to Supabase Storage
  await storage.upload('stickers', fileName, blob);

  // Get public URL
  const publicUrl = storage.getPublicUrl('stickers', fileName);

  return publicUrl;
}

export async function uploadTrayIcon(blob: Blob, packId: string): Promise<string> {
  const fileName = `${packId}/tray.png`;

  await storage.upload('tray-icons', fileName, blob);

  return storage.getPublicUrl('tray-icons', fileName);
}
```

---

## 📱 2. WhatsApp'a Ekleme İş Akışı

### Kullanıcı Akışı

```
1. Kullanıcı "WhatsApp'a Ekle" butonuna basar
   ↓
2. Supabase'den pack bilgisi ve sticker URL'leri çekilir
   ↓
3. Her sticker paralel olarak indirilir (fetch)
   ↓
4. Base64'e dönüştürülür
   ↓
5. Native Android/iOS plugin'e gönderilir
   ↓
6. Plugin WhatsApp intent'i tetikler
   ↓
7. WhatsApp açılır ve paket gösterilir
   ↓
8. Kullanıcı WhatsApp içinde "Ekle" butonuna basar
   ↓
9. ✅ Paket WhatsApp'a eklenir!
```

### Kod İmplementasyonu

```tsx
// PackDetailPage.tsx
import { useState } from 'react';
import { useStickerShare } from '@/hooks/useStickerShare';
import { getStickerPackById } from '@/services/stickerPackService';

export default function PackDetailPage() {
  const { shareWhatsApp, isSharing, progress } = useStickerShare();
  const [pack, setPack] = useState(null);

  useEffect(() => {
    // Supabase'den pack'i çek
    getStickerPackById(packId).then(setPack);
  }, [packId]);

  const handleAddToWhatsApp = async () => {
    if (!pack) return;

    // Native plugin ile WhatsApp'a ekle
    await shareWhatsApp(
      pack.name,
      pack.publisher,
      pack.stickers.map(s => s.image_url)
    );
  };

  return (
    <div>
      <h1>{pack?.name}</h1>

      <Button onClick={handleAddToWhatsApp} disabled={isSharing}>
        {isSharing ? `${progress?.message}` : 'WhatsApp\'a Ekle'}
      </Button>
    </div>
  );
}
```

---

## 🔧 3. Önemli Fonksiyonlar

### A. Sticker Pack Oluşturma (Admin)

```typescript
// src/services/stickerPackService.ts
export async function createStickerPack(
  packName: string,
  publisher: string,
  category: string,
  stickerBlobs: Blob[]
): Promise<string> {
  const packId = `pack_${Date.now()}`;

  // 1. Tray ikonu oluştur (ilk sticker'dan)
  const trayBlob = await createTrayIconFromSticker(stickerBlobs[0]);
  const trayUrl = await uploadTrayIcon(trayBlob, packId);

  // 2. Cover image oluştur
  const coverUrl = await uploadCoverImage(stickerBlobs[0], packId);

  // 3. Sticker'ları yükle
  const stickerUrls = await Promise.all(
    stickerBlobs.map((blob, i) => uploadStickerToSupabase(blob, packId, i))
  );

  // 4. Database'e kaydet
  const pack = await supabase
    .from('sticker_packs')
    .insert({
      id: packId,
      name: packName,
      publisher,
      category,
      tray_image_url: trayUrl,
      cover_image_url: coverUrl,
      creator_id: (await auth.getCurrentUser())?.id,
      creator_name: 'User Name',
      creator_avatar: 'avatar_url'
    })
    .select()
    .single();

  // 5. Sticker'ları database'e kaydet
  await supabase
    .from('stickers')
    .insert(
      stickerUrls.map((url, i) => ({
        pack_id: packId,
        image_url: url,
        order_index: i,
        emojis: [] // AI ile emoji tahmini yapılabilir
      }))
    );

  return packId;
}
```

### B. Tray Icon Oluşturma

```typescript
// WhatsApp gereksinimi: 96x96 PNG
export async function createTrayIconFromSticker(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      canvas.width = 96;
      canvas.height = 96;

      // Beyaz arka plan
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 96, 96);

      // Sticker'ı ortala
      const scale = Math.min(96 / img.width, 96 / img.height) * 0.8; // %80 boyut
      const x = (96 - img.width * scale) / 2;
      const y = (96 - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(),
        'image/png',
        1.0
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
```

### C. Auto-Crop (Kırpma)

```typescript
// Transparent piksel kenarları kırp
export async function autoCropTransparent(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Transparent olmayan pikselleri bul
      let minX = canvas.width, minY = canvas.height;
      let maxX = 0, maxY = 0;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          if (alpha > 10) { // Threshold
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // Yeni canvas oluştur (kırpılmış)
      const croppedWidth = maxX - minX + 1;
      const croppedHeight = maxY - minY + 1;
      const croppedCanvas = document.createElement('canvas');
      const croppedCtx = croppedCanvas.getContext('2d')!;

      croppedCanvas.width = croppedWidth;
      croppedCanvas.height = croppedHeight;

      croppedCtx.drawImage(
        canvas,
        minX, minY, croppedWidth, croppedHeight,
        0, 0, croppedWidth, croppedHeight
      );

      croppedCanvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(),
        'image/webp',
        0.85
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
```

---

## 🎯 4. Özellik Roadmap

### Yapılması Gerekenler

#### Faz 1: Core Fonksiyonlar ✅
- [x] WhatsApp Native Plugin
- [x] Supabase Entegrasyonu
- [x] Basic UI (Lovable)
- [ ] Runware.ai Entegrasyonu
- [ ] Hugging Face Background Removal

#### Faz 2: Sticker Üretimi
- [ ] Generate Page UI
- [ ] Prompt input ve validation
- [ ] AI generation pipeline
- [ ] Background removal
- [ ] Auto-crop
- [ ] WebP conversion
- [ ] Quality optimization

#### Faz 3: Pack Yönetimi
- [ ] Pack oluşturma (3-30 sticker)
- [ ] Tray icon otomatik oluştur
- [ ] Cover image otomatik oluştur
- [ ] Emoji tahmini (AI)
- [ ] Category selection
- [ ] Premium/Free marking

#### Faz 4: Kullanıcı Deneyimi
- [ ] Preview modal
- [ ] Share statistics
- [ ] Favorites
- [ ] Search
- [ ] User profiles
- [ ] Credits system

#### Faz 5: Monetization
- [ ] Freemium model
- [ ] Pro subscription
- [ ] Credit packs
- [ ] Ads (interstitial)

---

## 📋 5. Supabase Schema (SQL)

```sql
-- RLS (Row Level Security) etkinleştir
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sticker_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar kendi verilerini görebilir
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Herkes pack'leri görebilir
CREATE POLICY "Anyone can view packs"
ON sticker_packs FOR SELECT
USING (true);

-- Sadece pack sahibi silebilir
CREATE POLICY "Owners can delete packs"
ON sticker_packs FOR DELETE
USING (auth.uid() = creator_id);

-- Authenticated kullanıcılar pack oluşturabilir
CREATE POLICY "Authenticated users can create packs"
ON sticker_packs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

---

## 🚀 6. Deployment

### Production Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Runware.ai
VITE_RUNWARE_API_KEY=your-runware-key

# Hugging Face
VITE_HUGGING_FACE_TOKEN=your-hf-token

# App Config
VITE_APP_NAME=Kloze Stickers
VITE_APP_URL=https://kloze.app
```

### Build Commands

```bash
# Development
npm run dev

# Production build
npm run build
npx cap sync

# Android release
cd android
./gradlew assembleRelease

# iOS release
npx cap open ios
# Xcode'dan Archive
```

---

## 📝 Notlar

1. **WebP Kalite:** 0.80-0.85 arası optimal (100-200KB)
2. **Boyut:** Her sticker kesinlikle 512x512 olmalı
3. **Format:** WhatsApp sadece WebP kabul eder
4. **Tray:** 96x96 PNG, transparent veya beyaz arka plan
5. **Pack Limit:** Minimum 3, maksimum 30 sticker
6. **Emoji:** Her sticker'a max 3 emoji
7. **Cache:** Download'larda cache kullan (performans)

---

**Başarılar!** 🎉 Artık tam bir Sticker App'iniz var!
