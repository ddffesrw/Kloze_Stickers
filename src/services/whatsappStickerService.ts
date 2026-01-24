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
async function downloadAndCacheImage(url: string, fileName: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // "data:image/webp;base64," kısmını kaldır
        const base64Data = reader.result.split(',')[1];
        resolve(base64Data);
      } else {
        reject(new Error('Base64 dönüşümü başarısız'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  // Cache'e kaydet
  await Filesystem.writeFile({
    path: `sticker_cache/${fileName}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true
  });

  // Cache'den oku ve data URL olarak döndür
  const cachedFile = await Filesystem.readFile({
    path: `sticker_cache/${fileName}`,
    directory: Directory.Cache
  });

  return `data:image/webp;base64,${cachedFile.data}`;
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
    `sticker_${stickerData.id}.webp`
  );

  return {
    data: base64Data,
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

    const result = await WhatsAppStickers.addStickerPack(options);

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
