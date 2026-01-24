/**
 * useStickerPack Hook
 * Sticker pack yönetimi ve WhatsApp'a gönderme
 */

import { useState, useCallback, useEffect } from 'react';
import {
  canAddToWhatsApp,
  addPackToWhatsApp,
  type PackSticker
} from '@/services/stickerPackLogicService';

export interface UseStickerPackReturn {
  stickers: PackSticker[];
  addSticker: (sticker: PackSticker) => void;
  removeSticker: (stickerId: string) => void;
  reorderStickers: (fromIndex: number, toIndex: number) => void;
  clearPack: () => void;
  canAddToWhatsApp: boolean;
  sendToWhatsApp: (packId: string) => Promise<void>;
  isSending: boolean;
  sendProgress: any;
  sendError: string | null;
}

export function useStickerPack(initialStickers: PackSticker[] = []): UseStickerPackReturn {
  const [stickers, setStickers] = useState<PackSticker[]>(initialStickers);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [canAdd, setCanAdd] = useState(false);

  /**
   * Can add to WhatsApp kontrolü
   */
  useEffect(() => {
    setCanAdd(canAddToWhatsApp(stickers));
  }, [stickers]);

  /**
   * Sticker ekle
   */
  const addSticker = useCallback((sticker: PackSticker) => {
    setStickers(prev => {
      // Maksimum 30 sticker
      if (prev.length >= 30) {
        return prev;
      }

      // Duplicate kontrolü
      if (prev.some(s => s.id === sticker.id)) {
        return prev;
      }

      return [...prev, sticker];
    });
  }, []);

  /**
   * Sticker sil
   */
  const removeSticker = useCallback((stickerId: string) => {
    setStickers(prev => prev.filter(s => s.id !== stickerId));
  }, []);

  /**
   * Sticker sıralamasını değiştir (drag & drop için)
   */
  const reorderStickers = useCallback((fromIndex: number, toIndex: number) => {
    setStickers(prev => {
      const newStickers = [...prev];
      const [removed] = newStickers.splice(fromIndex, 1);
      newStickers.splice(toIndex, 0, removed);
      return newStickers;
    });
  }, []);

  /**
   * Pack'i temizle
   */
  const clearPack = useCallback(() => {
    setStickers([]);
  }, []);

  /**
   * WhatsApp'a gönder
   */
  const sendToWhatsApp = useCallback(async (packId: string) => {
    setIsSending(true);
    setSendError(null);
    setSendProgress(null);

    try {
      const result = await addPackToWhatsApp(
        packId,
        (progress) => setSendProgress(progress)
      );

      if (!result.success) {
        setSendError(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      setSendError(errorMessage);
      console.error('Send to WhatsApp error:', error);

    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  }, []);

  return {
    stickers,
    addSticker,
    removeSticker,
    reorderStickers,
    clearPack,
    canAddToWhatsApp: canAdd,
    sendToWhatsApp,
    isSending,
    sendProgress,
    sendError
  };
}
