# WhatsApp Stickers Entegrasyonu

Bu dokümantasyon, Kloze Stickers uygulamasının WhatsApp Sticker API entegrasyonunu açıklar.

## 📁 Dosya Yapısı

```
src/
├── plugins/
│   └── whatsapp-stickers/
│       ├── index.ts              # Plugin export
│       ├── definitions.ts        # TypeScript interface tanımları
│       └── web.ts               # Web platform stub
├── services/
│   └── whatsappStickerService.ts # Supabase entegrasyonu ve servis katmanı
├── hooks/
│   └── useWhatsAppStickers.ts   # React hook
└── components/
    └── kloze/
        └── AddToWhatsAppButton.tsx # Kullanıma hazır buton bileşeni

android/
└── app/src/main/java/app/lovable/kloze/
    └── WhatsAppStickersPlugin.kt # Native Android plugin
```

## 🚀 Kurulum

### 1. Capacitor Sync

```bash
npx cap sync android
```

### 2. Android Studio'da Plugin'i Kaydet

`android/app/src/main/java/.../MainActivity.kt` dosyasını açın ve plugin'i ekleyin:

```kotlin
import app.lovable.kloze.WhatsAppStickersPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        registerPlugin(WhatsAppStickersPlugin::class.java)
    }
}
```

### 3. Android Manifest Güncellemesi

`android/app/src/main/AndroidManifest.xml` dosyasına WhatsApp query ekleyin:

```xml
<manifest>
    <!-- ... -->

    <queries>
        <package android:name="com.whatsapp" />
    </queries>
</manifest>
```

## 💡 Kullanım

### Temel Kullanım

```tsx
import { AddToWhatsAppButton } from '@/components/kloze/AddToWhatsAppButton';

function StickerPackPage() {
  // Supabase'den gelen veriler
  const packInfo = {
    identifier: 'kloze_funny_001',
    name: 'Komik Stickerlar',
    publisher: 'Kloze',
    trayImageUrl: 'https://your-supabase-url.supabase.co/storage/v1/object/public/stickers/tray.png',
    stickers: [
      {
        id: '1',
        url: 'https://your-supabase-url.supabase.co/storage/v1/object/public/stickers/sticker1.webp',
        emojis: ['😀', '😄']
      },
      // ... minimum 3, maksimum 30 sticker
    ]
  };

  return (
    <div>
      <h1>{packInfo.name}</h1>
      <AddToWhatsAppButton packInfo={packInfo}>
        WhatsApp'a Ekle
      </AddToWhatsAppButton>
    </div>
  );
}
```

### Hook ile Özelleştirilmiş Kullanım

```tsx
import { useWhatsAppStickers, getProgressMessage } from '@/hooks/useWhatsAppStickers';

function CustomStickerPackButton() {
  const { addToWhatsApp, isLoading, progress, error } = useWhatsAppStickers();

  const handleAddToWhatsApp = async () => {
    const result = await addToWhatsApp({
      identifier: 'my_pack_001',
      name: 'Özel Paket',
      publisher: 'Kloze',
      trayImageUrl: '...',
      stickers: [...],
      publisherWebsite: 'https://kloze.app',
      privacyPolicyWebsite: 'https://kloze.app/privacy',
      licenseAgreementWebsite: 'https://kloze.app/terms'
    });

    if (result.success) {
      console.log('Başarıyla eklendi!');
    } else {
      console.error('Hata:', result.message);
    }
  };

  return (
    <div>
      <button onClick={handleAddToWhatsApp} disabled={isLoading}>
        {isLoading ? getProgressMessage(progress) : 'WhatsApp\'a Ekle'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Direkt Servis Kullanımı

```tsx
import { addStickerPackToWhatsApp } from '@/services/whatsappStickerService';

async function addStickers() {
  const result = await addStickerPackToWhatsApp(
    {
      identifier: 'pack_001',
      name: 'Sticker Paketi',
      publisher: 'Kloze',
      trayImageUrl: '...',
      stickers: [...]
    },
    (progress) => {
      console.log(`${progress.stage}: ${progress.current}/${progress.total}`);
    }
  );

  if (result.success) {
    console.log('Başarılı!');
  }
}
```

## 📋 WhatsApp Gereksinimleri

### Tray İkon
- **Format:** PNG
- **Boyut:** 96x96 piksel
- **Gereksinimler:**
  - Transparent background önerilir
  - Maksimum boyut: 50KB

### Sticker'lar
- **Format:** WebP (animated veya static)
- **Boyut:** 512x512 piksel
- **Gereksinimler:**
  - Sayı: Minimum 3, maksimum 30
  - Maksimum dosya boyutu: 100KB
  - Transparent background önerilir
  - Her sticker'a max 3 emoji eklenebilir

### Paket Bilgileri
- **identifier:** Benzersiz paket ID (örn: `kloze_funny_001`)
- **name:** Paket adı (max 128 karakter)
- **publisher:** Yayıncı adı (max 128 karakter)

## 🔧 Supabase Entegrasyonu

### Storage Yapısı Örneği

```
stickers/
├── packs/
│   ├── funny/
│   │   ├── tray.png
│   │   ├── sticker1.webp
│   │   ├── sticker2.webp
│   │   └── ...
│   └── cute/
│       ├── tray.png
│       └── ...
```

### Supabase'den Veri Çekme

```typescript
// Örnek Supabase query
const { data: stickerPack } = await supabase
  .from('sticker_packs')
  .select(`
    id,
    name,
    publisher,
    tray_image_url,
    stickers (
      id,
      image_url,
      emojis
    )
  `)
  .eq('id', packId)
  .single();

// WhatsApp formatına dönüştür
const packInfo: StickerPackInfo = {
  identifier: `kloze_${stickerPack.id}`,
  name: stickerPack.name,
  publisher: stickerPack.publisher,
  trayImageUrl: stickerPack.tray_image_url,
  stickers: stickerPack.stickers.map(s => ({
    id: s.id,
    url: s.image_url,
    emojis: s.emojis
  }))
};
```

## 🐛 Hata Yönetimi

```typescript
const result = await addToWhatsApp(packInfo);

if (!result.success) {
  switch (result.errorCode) {
    case 'WHATSAPP_NOT_INSTALLED':
      // WhatsApp yüklü değil
      alert('Lütfen WhatsApp\'ı yükleyin');
      break;

    case 'INSUFFICIENT_STICKERS':
      // Yetersiz sticker sayısı
      alert('En az 3 sticker gerekli');
      break;

    case 'TOO_MANY_STICKERS':
      // Çok fazla sticker
      alert('Maksimum 30 sticker eklenebilir');
      break;

    case 'PLATFORM_NOT_SUPPORTED':
      // Web platformunda
      alert('Bu özellik sadece mobil uygulamada çalışır');
      break;

    default:
      alert(result.message);
  }
}
```

## 🎨 Progress Gösterimi

```tsx
import { useWhatsAppStickers, getProgressMessage } from '@/hooks/useWhatsAppStickers';
import { Progress } from '@/components/ui/progress';

function StickerPackWithProgress() {
  const { addToWhatsApp, isLoading, progress } = useWhatsAppStickers();

  return (
    <div>
      {isLoading && progress && (
        <div>
          <Progress value={(progress.current / progress.total) * 100} />
          <p>{getProgressMessage(progress)}</p>
        </div>
      )}
      <button onClick={() => addToWhatsApp(packInfo)}>
        Ekle
      </button>
    </div>
  );
}
```

## 🧪 Test

### Android Emulator'da Test

1. Android Studio'da emulator başlatın
2. WhatsApp'ı emulator'a yükleyin
3. Uygulamayı run edin:
   ```bash
   npx cap run android
   ```

### Gerçek Cihazda Test

1. USB debugging açın
2. WhatsApp'ın yüklü olduğundan emin olun
3. Uygulamayı cihaza yükleyin:
   ```bash
   npx cap run android --target <device-id>
   ```

## 📱 Platform Desteği

- ✅ **Android:** Tam destek
- ✅ **iOS:** Tam destek (native kod eklenmeli)
- ❌ **Web:** Desteklenmiyor (platform uyarısı gösterilir)

## 🔗 Faydalı Linkler

- [WhatsApp Stickers API Dokümantasyonu](https://faq.whatsapp.com/general/how-to-create-stickers-for-whatsapp)
- [Capacitor Plugins Geliştirme](https://capacitorjs.com/docs/plugins)
- [Android Intent Referansı](https://developer.android.com/guide/components/intents-filters)

## 📝 Notlar

- Sticker'lar cache'lenir, performans için otomatik temizleme yapılır
- Base64 dönüşümleri memory-efficient şekilde yapılır
- Network hatalarına karşı retry mekanizması eklenebilir
- iOS için ayrı native kod gereklidir (Swift/Objective-C)
