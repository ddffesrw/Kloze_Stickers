# KLOZE Stickers - iOS Kurulum Rehberi

## Gereksinimler
- Mac bilgisayar (macOS 13+)
- Xcode 15+ (App Store'dan ücretsiz)
- Apple ID (ücretsiz)
- iPhone (iOS 14+)

## Adım Adım Kurulum

### 1. Projeyi Mac'e Kopyala
Tüm proje klasörünü Mac'e kopyalayın (USB, AirDrop, veya cloud ile).

### 2. Xcode'u Aç
```bash
cd /path/to/KLOZEsticker/ios/App
open App.xcworkspace
```

**ÖNEMLİ:** `.xcodeproj` değil, `.xcworkspace` dosyasını açın!

### 3. Bundle Identifier Ayarla
1. Xcode'da sol panelden "App" projesine tıklayın
2. "Signing & Capabilities" sekmesine gidin
3. "Team" alanında Apple ID'nizi seçin (yoksa "Add Account" ile ekleyin)
4. "Bundle Identifier" olarak şunu yazın: `com.klozestickers.app`
5. Eğer hata verirse, benzersiz bir isim deneyin: `com.SIZINISMINIZ.klozestickers`

### 4. WhatsApp Plugin Dosyalarını Projeye Ekle
Xcode'da:
1. Sol panelde "App" klasörüne sağ tıklayın
2. "Add Files to App..." seçin
3. Şu dosyaları ekleyin:
   - `WhatsAppStickersPlugin.swift`
   - `WhatsAppStickersPlugin.m`
4. "Copy items if needed" işaretli olsun
5. Target: "App" seçili olsun

### 5. iPhone'u Bağla
1. iPhone'u USB kabloyla Mac'e bağlayın
2. iPhone'da "Bu bilgisayara güven" diyaloğunu onaylayın
3. Xcode'da üst menüden cihazınızı seçin (Simulator yerine)

### 6. Developer Mode Aç (iOS 16+)
iPhone'da:
1. Ayarlar > Gizlilik ve Güvenlik > Geliştirici Modu
2. Geliştirici Modu'nu açın
3. Cihaz yeniden başlatılacak

### 7. Build ve Run
1. Xcode'da ▶️ (Play) butonuna tıklayın
2. İlk seferde "Untrusted Developer" hatası alabilirsiniz
3. iPhone'da: Ayarlar > Genel > VPN ve Cihaz Yönetimi > Developer App > Güven

### 8. Test Et
- Uygulama iPhone'da açılacak
- Sticker paketi oluşturun
- "WhatsApp'a Ekle" butonunu test edin

## Önemli Notlar

### Ücretsiz Geliştirici Hesabı Kısıtlamaları:
- ⏰ Uygulama 7 gün sonra sona erer (tekrar yüklemeniz gerekir)
- 📱 Maksimum 3 cihaza yükleyebilirsiniz
- ❌ Push Notifications çalışmaz
- ❌ In-App Purchase test edilemez

### WhatsApp Sticker Test:
- iPhone'da WhatsApp yüklü olmalı
- Sticker paketi en az 3 sticker içermeli
- Her sticker 512x512 piksel WebP formatında olmalı

### Sorun Giderme:

**"Untrusted Developer" hatası:**
iPhone > Ayarlar > Genel > VPN ve Cihaz Yönetimi > Uygulamaya güven

**"Unable to install" hatası:**
1. Xcode > Product > Clean Build Folder
2. iPhone'da eski uygulamayı silin
3. Tekrar deneyin

**"Code signing" hatası:**
1. Signing & Capabilities'de Team seçili olduğundan emin olun
2. Bundle ID'yi benzersiz yapın

**Build başarısız:**
```bash
cd /path/to/KLOZEsticker
npm run build
npx cap sync ios
```

## Dosya Yapısı
```
ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── WhatsAppStickersPlugin.swift  ← WhatsApp plugin
│   │   ├── WhatsAppStickersPlugin.m      ← Bridge dosyası
│   │   ├── Info.plist                    ← Uygulama ayarları
│   │   └── public/                       ← Web assets
│   ├── App.xcodeproj/
│   └── App.xcworkspace/                  ← BUNU AÇ!
└── capacitor-cordova-ios-plugins/
```

## Yardım
Sorun yaşarsanız logları kontrol edin:
- Xcode > View > Debug Area > Activate Console
