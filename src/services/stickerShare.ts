/**
 * Sticker Share Service
 * WhatsApp ve Telegram'a sticker paketi paylaşım işlemleri
 * Native WhatsApp Sticker API kullanır
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { WhatsAppStickers } from '@/plugins/whatsapp-stickers';
import {
  addStickerPackToWhatsApp,
  type StickerPackInfo,
  type DownloadProgress
} from './whatsappStickerService';
import {
  convertMultipleStickers,
  createTrayIcon,
  createWhatsAppPackData,
  type StickerPackData
} from './stickerConverter';

export interface ShareProgress {
  stage: 'converting' | 'saving' | 'sharing';
  current: number;
  total: number;
  message: string;
}

export interface ShareResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Platform kontrolü
 */
export function getPlatform(): 'ios' | 'android' | 'web' {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'web';
}

/**
 * WhatsApp yüklü mü kontrol et
 */
export function isWhatsAppInstalled(): boolean {
  // Native ortamda gerçek kontrol yapılır
  // Web'de her zaman true döner (link ile yönlendirme yapılır)
  return true;
}

/**
 * Telegram yüklü mü kontrol et
 */
export function isTelegramInstalled(): boolean {
  return true;
}

/**
 * Sticker paketini WhatsApp'a gönder
 * NATIVE WhatsApp Sticker API kullanır
 */
export async function shareToWhatsApp(
  packName: string,
  publisher: string,
  stickerUrls: string[],
  onProgress?: (progress: ShareProgress) => void
): Promise<ShareResult> {
  try {
    const platform = getPlatform();

    if (platform === 'web') {
      return {
        success: false,
        message: 'WhatsApp entegrasyonu mobil uygulamada kullanılabilir. Uygulamayı indirin!',
        error: 'WEB_PLATFORM'
      };
    }

    // Unique identifier oluştur
    const identifier = `kloze_${packName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

    // StickerPackInfo formatına çevir
    const packInfo: StickerPackInfo = {
      identifier,
      name: packName,
      publisher: publisher || 'Kloze Stickers',
      trayImageUrl: stickerUrls[0], // İlk sticker'ı tray ikonu olarak kullan
      stickers: stickerUrls.map((url, index) => ({
        id: `${index}`,
        url,
        emojis: [] // Emoji'ler veritabanından gelebilir
      })),
      publisherWebsite: 'https://kloze.app',
      privacyPolicyWebsite: 'https://kloze.app/privacy',
      licenseAgreementWebsite: 'https://kloze.app/terms'
    };

    // Progress callback adapter
    const progressAdapter = (prog: DownloadProgress) => {
      const stage = prog.stage === 'checking' || prog.stage === 'downloading_tray' || prog.stage === 'downloading_stickers'
        ? 'converting'
        : prog.stage === 'preparing'
        ? 'saving'
        : 'sharing';

      onProgress?.({
        stage,
        current: prog.current,
        total: prog.total,
        message: prog.message
      });
    };

    // Native plugin ile WhatsApp'a ekle
    const result = await addStickerPackToWhatsApp(packInfo, progressAdapter);

    return {
      success: result.success,
      message: result.message,
      error: result.errorCode
    };

  } catch (error) {
    console.error('WhatsApp paylaşım hatası:', error);
    return {
      success: false,
      message: 'Paylaşım sırasında bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}

/**
 * Sticker paketini Telegram'a gönder
 * Telegram deep link kullanarak yönlendirme yapar
 */
export async function shareToTelegram(
  packName: string,
  stickerUrls: string[],
  onProgress?: (progress: ShareProgress) => void
): Promise<ShareResult> {
  try {
    // Dönüştürme aşaması
    onProgress?.({
      stage: 'converting',
      current: 0,
      total: stickerUrls.length,
      message: 'Stickerlar hazırlanıyor...'
    });
    
    const convertedStickers = await convertMultipleStickers(
      stickerUrls,
      'telegram',
      (current, total) => {
        onProgress?.({
          stage: 'converting',
          current,
          total,
          message: `Sticker ${current}/${total} hazırlanıyor...`
        });
      }
    );
    
    // Telegram Bot API ile paket oluşturma backend'de yapılacak
    // Şimdilik genel paylaşım kullanıyoruz
    
    const platform = getPlatform();
    
    if (platform === 'web') {
      // Web'de Telegram mesaj paylaşım linki
      const shareText = encodeURIComponent(
        `${packName} sticker paketi - Kloze Stickers'tan indir!`
      );
      window.open(`https://t.me/share/url?url=${window.location.href}&text=${shareText}`, '_blank');
      
      return {
        success: true,
        message: 'Telegram açıldı!'
      };
    }
    
    // Native'de Share API kullan
    await Share.share({
      title: packName,
      text: `${packName} sticker paketi - Kloze Stickers`,
      url: window.location.href,
      dialogTitle: 'Telegram ile Paylaş'
    });
    
    return {
      success: true,
      message: 'Paylaşım başarılı!'
    };
    
  } catch (error) {
    console.error('Telegram paylaşım hatası:', error);
    return {
      success: false,
      message: 'Paylaşım sırasında bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}

/**
 * Genel paylaşım (diğer uygulamalar için)
 */
export async function shareGeneral(
  packName: string,
  description: string
): Promise<ShareResult> {
  try {
    await Share.share({
      title: packName,
      text: description,
      url: window.location.href,
      dialogTitle: 'Paylaş'
    });
    
    return {
      success: true,
      message: 'Paylaşım başarılı!'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Paylaşım iptal edildi',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    };
  }
}
