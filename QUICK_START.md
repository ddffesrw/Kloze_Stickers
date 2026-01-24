# 🚀 WhatsApp Stickers - Hızlı Başlangıç

## 📦 Kurulum (5 Dakika)

### 1. Capacitor Sync
```bash
npx cap sync
```

### 2. Android Ayarları

**MainActivity.kt** dosyasını güncelleyin:
```kotlin
// android/app/src/main/java/.../MainActivity.kt
import app.lovable.kloze.WhatsAppStickersPlugin

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        registerPlugin(WhatsAppStickersPlugin::class.java)
    }
}
```

**AndroidManifest.xml** içindeki `<manifest>` tag'ine ekleyin:
```xml
<queries>
    <package android:name="com.whatsapp" />
</queries>
```

### 3. iOS Ayarları (Opsiyonel)

**Info.plist** dosyasına ekleyin:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>whatsapp</string>
</array>
```

## 💻 Kullanım (3 Satır Kod)

### En Basit Kullanım

```tsx
import { AddToWhatsAppButton } from '@/components/kloze/AddToWhatsAppButton';

function MyComponent() {
  const packInfo = {
    identifier: 'my_pack_001',
    name: 'Paket Adı',
    publisher: 'Yayıncı Adı',
    trayImageUrl: 'https://supabase-url/tray.png',
    stickers: [
      { id: '1', url: 'https://supabase-url/sticker1.webp', emojis: ['😀'] },
      { id: '2', url: 'https://supabase-url/sticker2.webp', emojis: ['😎'] },
      { id: '3', url: 'https://supabase-url/sticker3.webp', emojis: ['🎉'] },
      // ... 3-30 arası sticker
    ]
  };

  return (
    <AddToWhatsAppButton packInfo={packInfo}>
      WhatsApp'a Ekle
    </AddToWhatsAppButton>
  );
}
```

Bu kadar! 🎉

## 📱 Test

```bash
# Android
npx cap run android

# iOS
npx cap run ios
```

## 🎨 Özelleştirme

### Progress ile

```tsx
import { useWhatsAppStickers } from '@/hooks/useWhatsAppStickers';

function MyButton() {
  const { addToWhatsApp, isLoading, progress } = useWhatsAppStickers();

  return (
    <button onClick={() => addToWhatsApp(packInfo)} disabled={isLoading}>
      {isLoading ? `${progress?.message}` : 'WhatsApp\'a Ekle'}
    </button>
  );
}
```

### Hata Yönetimi ile

```tsx
const { addToWhatsApp, error, resetError } = useWhatsAppStickers();

const handleClick = async () => {
  const result = await addToWhatsApp(packInfo);

  if (!result.success) {
    alert(result.message);
  }
};
```

## ✅ Gereksinimler

### Tray İkon
- Format: PNG
- Boyut: 96x96 px
- Max: 50KB

### Sticker'lar
- Format: WebP
- Boyut: 512x512 px
- Sayı: 3-30 arası
- Max: 100KB/sticker

## 🔗 Daha Fazla

- [Detaylı Dokümantasyon](./WHATSAPP_STICKERS_SETUP.md)
- [Örnek Kullanımlar](./src/examples/StickerPackExample.tsx)

## ⚡ Önemli Notlar

1. **Platform:** Sadece mobil (Android/iOS) desteklenir
2. **WhatsApp:** Cihazda yüklü olmalı
3. **İnternet:** Supabase'den indirmek için gerekli
4. **Cache:** Otomatik temizlenir

## 🐛 Sorun mu var?

```tsx
// WhatsApp yüklü mü kontrol et
import { WhatsAppStickers } from '@/plugins/whatsapp-stickers';

const { installed } = await WhatsAppStickers.isWhatsAppInstalled();
if (!installed) {
  alert('WhatsApp yüklü değil');
}
```

## 📞 Destek

Sorun yaşıyorsanız:
1. Önce [WHATSAPP_STICKERS_SETUP.md](./WHATSAPP_STICKERS_SETUP.md) dosyasını okuyun
2. [Örnek kullanımları](./src/examples/StickerPackExample.tsx) inceleyin
3. Console'da hata mesajlarını kontrol edin

---

**Hazır!** 🎉 Artık WhatsApp'a sticker ekleyebilirsiniz.
