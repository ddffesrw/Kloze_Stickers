/**
 * useWhatsAppStickers Hook
 * WhatsApp'a sticker paketi ekleme için React hook
 */

import { useState, useCallback } from 'react';
import {
  addStickerPackToWhatsApp,
  clearStickerCache,
  type StickerPackInfo,
  type DownloadProgress,
  type AddToWhatsAppResult
} from '../services/whatsappStickerService';

export interface UseWhatsAppStickersState {
  isLoading: boolean;
  progress: DownloadProgress | null;
  error: string | null;
}

export interface UseWhatsAppStickersReturn extends UseWhatsAppStickersState {
  addToWhatsApp: (packInfo: StickerPackInfo) => Promise<AddToWhatsAppResult>;
  clearCache: () => Promise<void>;
  resetError: () => void;
}

/**
 * WhatsApp sticker işlemleri için hook
 *
 * @example
 * ```tsx
 * const { addToWhatsApp, isLoading, progress, error } = useWhatsAppStickers();
 *
 * const handleAddToWhatsApp = async () => {
 *   const packInfo: StickerPackInfo = {
 *     identifier: 'my_pack_001',
 *     name: 'Kloze Stickers',
 *     publisher: 'Kloze',
 *     trayImageUrl: 'https://supabase.co/storage/.../tray.png',
 *     stickers: [
 *       { id: '1', url: 'https://supabase.co/storage/.../sticker1.webp', emojis: ['😀'] },
 *       { id: '2', url: 'https://supabase.co/storage/.../sticker2.webp', emojis: ['😎'] },
 *       // ... en az 3, max 30 sticker
 *     ]
 *   };
 *
 *   const result = await addToWhatsApp(packInfo);
 *   if (result.success) {
 *     console.log('Başarılı!');
 *   }
 * };
 * ```
 */
export function useWhatsAppStickers(): UseWhatsAppStickersReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Sticker paketini WhatsApp'a ekle
   */
  const addToWhatsApp = useCallback(async (
    packInfo: StickerPackInfo
  ): Promise<AddToWhatsAppResult> => {
    setIsLoading(true);
    setError(null);
    setProgress(null);

    try {
      const result = await addStickerPackToWhatsApp(packInfo, (prog) => {
        setProgress(prog);
      });

      if (!result.success) {
        setError(result.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);

      return {
        success: false,
        message: errorMessage,
        errorCode: 'UNKNOWN_ERROR'
      };
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, []);

  /**
   * Cache'i temizle
   */
  const clearCache = useCallback(async () => {
    try {
      await clearStickerCache();
    } catch (err) {
      console.warn('Cache temizleme hatası:', err);
    }
  }, []);

  /**
   * Hata durumunu sıfırla
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    progress,
    error,
    addToWhatsApp,
    clearCache,
    resetError
  };
}

/**
 * Progress mesajlarını Türkçe'ye çevir
 */
export function getProgressMessage(progress: DownloadProgress | null): string {
  if (!progress) return '';

  switch (progress.stage) {
    case 'checking':
      return 'WhatsApp kontrol ediliyor...';
    case 'downloading_tray':
      return 'Paket ikonu indiriliyor...';
    case 'downloading_stickers':
      return `Sticker'lar indiriliyor... (${progress.current}/${progress.total})`;
    case 'preparing':
      return 'Hazırlanıyor...';
    case 'adding':
      return 'WhatsApp\'a ekleniyor...';
    default:
      return progress.message;
  }
}
