/**
 * WhatsApp Sticker Service
 * Supabase'den sticker'ları indirir ve WhatsApp'a gönderir
 */

import { WhatsAppStickers, type AddStickerPackOptions, type StickerFile } from '../plugins/whatsapp-stickers';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface StickerData {
  id: string;
  url: string; // Supabase storage URL
  emojis?: string[];
}

export interface StickerPackInfo {
  identifier: string;
  name: string;
  publisher: string;
  trayImageUrl: string; // Supabase storage URL
  stickers: StickerData[];
  publisherWebsite?: string;
  privacyPolicyWebsite?: string;
  licenseAgreementWebsite?: string;
}

export interface DownloadProgress {
  stage: 'checking' | 'downloading_tray' | 'downloading_stickers' | 'preparing' | 'adding';
  current: number;
  total: number;
  message: string;
}

export interface AddToWhatsAppResult {
  success: boolean;
  message: string;
  errorCode?: string;
}

/**
 * URL'den resmi base64'e çevir
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Base64 dönüşümü başarısız'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Resmi indirip cache'e kaydet
 */
/**
 * Resmi indirip cache'e kaydet (Cache sadece original indirme için kullanılıyor)
 */
async function downloadAndCacheImage(url: string, fileName: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  // MIME type kontrolü
  // console.log(`Downloaded ${fileName}, type: ${blob.type}, size: ${blob.size}`);

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // data:image/png;base64,.....
        // Biz sadece virgülden sonrasını alıp dosyaya kaydediyoruz
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error('Base64 dönüşümü başarısız'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Ham dosyayı cache'e kaydet (resize öncesi yedek gibi)
  // Bu adım aslında zorunlu değil ama debug için iyi olabilir.
  try {
    await Filesystem.writeFile({
      path: `sticker_cache/${fileName}`,
      data: base64,
      directory: Directory.Cache,
      recursive: true
    });
  } catch (e) {
    console.warn('Cache write failed (non-critical):', e);
  }

  // Fonksiyon orijinal olarak data URL dönüyordu, uyumluluğu koruyalım
  // Ancak doğru mime type ile dönmesi resize fonksiyonu için önemli
  return `data:${blob.type};base64,${base64}`;
}

/**
 * Resmi 512x512 boyutuna yeniden boyutlandır ve WebP'ye çevir
 */
/**
 * Resmi 512x512 boyutuna yeniden boyutlandır ve WebP'ye çevir
 * WhatsApp Limiti: 512x512 piksel ve < 100 KB
 */
async function resizeTo512x512(base64Data: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context failed'));
        return;
      }

      // Şeffaf arka plan
      ctx.clearRect(0, 0, 512, 512);

      // Aspect ratio koruyarak ortala
      const scale = Math.min(512 / img.width, 512 / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (512 - w) / 2;
      const y = (512 - h) / 2;

      ctx.drawImage(img, x, y, w, h);

      // Kaliteyi düşürerek 100KB altına inmeye çalış
      let quality = 0.8;
      let resized = canvas.toDataURL('image/webp', quality);

      // Base64 uzunluğundan dosya boyutu hesapla (Padding dahil)
      const calculateSizeInBytes = (base64String: string) => {
        // Data URL header'ı (data:image/webp;base64,) varsa çıkar
        const base64 = base64String.split(',')[1] || base64String;
        let padding = 0;
        if (base64.endsWith('==')) padding = 2;
        else if (base64.endsWith('=')) padding = 1;
        return (base64.length * 3 / 4) - padding;
      };

      // 100KB sınırına çok yaklaşmamak için 95KB hedefle
      // WhatsApp limiti katı 100KB (102400 bytes)
      const MAX_SIZE_BYTES = 95 * 1024; // ~97280 bytes

      let currentSize = calculateSizeInBytes(resized);
      console.log(`Initial resize check: Quality ${quality}, Size ${currentSize} bytes`);

      while (currentSize > MAX_SIZE_BYTES && quality > 0.1) {
        quality -= 0.1;
        resized = canvas.toDataURL('image/webp', quality);
        currentSize = calculateSizeInBytes(resized);
        console.log(`Reduced quality to ${quality.toFixed(1)}, New Size: ${currentSize} bytes`);
      }

      if (currentSize > MAX_SIZE_BYTES) {
        console.warn(`Sticker 95KB altına indirilemedi (${currentSize} bytes), yine de deneniyor.`);
      } else {
        console.log(`Sticker prepared successfully: ${currentSize} bytes (<${MAX_SIZE_BYTES})`);
      }

      resolve(resized);
    };
    img.onerror = (e) => reject(e);

    // Header kontrolü ve ekleme
    if (base64Data.startsWith('data:')) {
      img.src = base64Data;
    } else {
      // PNG varsayımı yerine generic image header ekle, tarayıcı halleder
      img.src = `data:image/png;base64,${base64Data}`;
    }
  });
}

/**
 * Tray ikonunu hazırla (96x96 PNG olmalı)
 * PROFESYONEL: Beyaz arka plan, %80 boyut, ortalı
 */
async function prepareTrayIcon(url: string): Promise<string> {
  // Profesyonel tray icon generator kullan
  const { createTrayIconBase64 } = await import('./trayIconGenerator');
  return createTrayIconBase64(url, '#FFFFFF');
}

/**
 * Sticker'ı hazırla (512x512 WebP olmalı)
 */
async function prepareSticker(stickerData: StickerData): Promise<StickerFile> {
  // Supabase'den indir
  const base64Data = await downloadAndCacheImage(
    stickerData.url,
    `sticker_${stickerData.id}_raw.webp` // Önce ham hali indir
  );

  // 512x512'ye resize et
  // downloadAndCacheImage header sız base64 döndürüyor, biz onu resizeTo512x512'ye sokuyoruz
  // Ancak downloadAndCacheImage zaten dosya yazıyor.
  // Bizim resize fonksiyonu bellek üzerinde çalışsın.

  // Düzeltme: downloadAndCacheImage'ı sadece indirmek için kullanalım,
  // Sonra resize edip ASIL isme (`sticker_${stickerData.id}.webp`) kaydedelim.

  // Şimdilik hızlı çözüm: raw indirilen veriyi resize et
  // Not: downloadAndCacheImage data URL döndürmüyor, "data:image/webp;base64,..." şeklinde tam string döndürüyor.
  // split lazim.

  const rawBase64 = base64Data.split(',')[1];
  const resizedDataUrl = await resizeTo512x512(rawBase64);

  // Resize edilmiş hali dosyaya yaz (WhatsApp plugini dosyadan okumuyor, base64 aliyor ama biz cache'leyelim)
  // Plugin şu an base64 alıyor.

  return {
    data: resizedDataUrl,
    emojis: stickerData.emojis?.slice(0, 3) // Max 3 emoji
  };
}

/**
 * WhatsApp'a sticker paketi ekle
 */
export async function addStickerPackToWhatsApp(
  packInfo: StickerPackInfo,
  onProgress?: (progress: DownloadProgress) => void
): Promise<AddToWhatsAppResult> {
  try {
    // WhatsApp yüklü mü kontrol et
    onProgress?.({
      stage: 'checking',
      current: 0,
      total: 1,
      message: 'WhatsApp kontrol ediliyor...'
    });

    const { installed } = await WhatsAppStickers.isWhatsAppInstalled();
    if (!installed) {
      return {
        success: false,
        message: 'WhatsApp yüklü değil. Lütfen WhatsApp\'ı yükleyin.',
        errorCode: 'WHATSAPP_NOT_INSTALLED'
      };
    }

    // Validasyon
    if (packInfo.stickers.length < 3) {
      return {
        success: false,
        message: 'En az 3 sticker gerekli',
        errorCode: 'INSUFFICIENT_STICKERS'
      };
    }

    if (packInfo.stickers.length > 30) {
      return {
        success: false,
        message: 'Maksimum 30 sticker eklenebilir',
        errorCode: 'TOO_MANY_STICKERS'
      };
    }

    // Tray ikonunu indir
    onProgress?.({
      stage: 'downloading_tray',
      current: 0,
      total: 1,
      message: 'Paket ikonu indiriliyor...'
    });

    const trayImage = await prepareTrayIcon(packInfo.trayImageUrl);

    // Sticker'ları indir
    onProgress?.({
      stage: 'downloading_stickers',
      current: 0,
      total: packInfo.stickers.length,
      message: 'Sticker\'lar indiriliyor...'
    });

    const preparedStickers: StickerFile[] = [];
    for (let i = 0; i < packInfo.stickers.length; i++) {
      const sticker = await prepareSticker(packInfo.stickers[i]);
      preparedStickers.push(sticker);

      onProgress?.({
        stage: 'downloading_stickers',
        current: i + 1,
        total: packInfo.stickers.length,
        message: `Sticker ${i + 1}/${packInfo.stickers.length} indiriliyor...`
      });
    }

    // WhatsApp'a gönder
    onProgress?.({
      stage: 'adding',
      current: 0,
      total: 1,
      message: 'WhatsApp\'a ekleniyor...'
    });

    const options: AddStickerPackOptions = {
      identifier: packInfo.identifier,
      name: packInfo.name,
      publisher: packInfo.publisher,
      trayImage,
      stickers: preparedStickers,
      publisherWebsite: packInfo.publisherWebsite,
      privacyPolicyWebsite: packInfo.privacyPolicyWebsite,
      licenseAgreementWebsite: packInfo.licenseAgreementWebsite
    };

    console.log('--- DEBUG: Sending to WhatsApp ---');
    console.log('Intent Info:', JSON.stringify({
      action: 'com.whatsapp.intent.action.ENABLE_STICKER_PACK',
      package: 'com.whatsapp',
      extras: {
        sticker_pack_id: options.identifier,
        sticker_pack_name: options.name,
        sticker_pack_publisher: options.publisher
      }
    }, null, 2));

    const result = await WhatsAppStickers.addStickerPack(options);
    console.log('Plugin Result Full:', JSON.stringify(result));

    if (result.success) {
      // WhatsApp açıldı mı kontrol et (Basit check)
      setTimeout(() => {
        if (document.hidden) {
          console.log('WhatsApp açıldı (App arka planda)');
        } else {
          console.warn('Uygulama hala ön planda görünüyor (document.hidden=false). Ancak loglarda "App paused" varsa işlem başarılıdır.');
        }
      }, 2000); // 1.5s -> 2s (Emülatör yavaş olabilir)
    }

    return {
      success: result.success,
      message: result.message,
      errorCode: result.errorCode
    };

  } catch (error) {
    console.error('WhatsApp\'a ekleme hatası:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Cache'i temizle
 */
export async function clearStickerCache(): Promise<void> {
  try {
    await Filesystem.rmdir({
      path: 'sticker_cache',
      directory: Directory.Cache,
      recursive: true
    });
  } catch (error) {
    console.warn('Cache temizleme hatası:', error);
  }
}
