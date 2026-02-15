import { useState, useCallback } from 'react';
import {
  shareToWhatsApp,
  shareToTelegram,
  shareGeneral,
  type ShareProgress,
  type ShareResult
} from '@/services/stickerShare';

export interface UseStickerShareReturn {
  isSharing: boolean;
  progress: ShareProgress | null;
  result: ShareResult | null;
  shareWhatsApp: (packName: string, publisher: string, stickerUrls: string[]) => Promise<ShareResult>;
  shareTelegram: (packName: string, stickerUrls: string[]) => Promise<ShareResult>;
  shareOther: (packName: string, description: string, url?: string) => Promise<ShareResult>;
  reset: () => void;
}

export function useStickerShare(): UseStickerShareReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [progress, setProgress] = useState<ShareProgress | null>(null);
  const [result, setResult] = useState<ShareResult | null>(null);

  const reset = useCallback(() => {
    setIsSharing(false);
    setProgress(null);
    setResult(null);
  }, []);

  const shareWhatsApp = useCallback(async (
    packName: string,
    publisher: string,
    stickerUrls: string[]
  ): Promise<ShareResult> => {
    setIsSharing(true);
    setProgress(null);
    setResult(null);

    try {
      const shareResult = await shareToWhatsApp(
        packName,
        publisher,
        stickerUrls,
        setProgress
      );
      setResult(shareResult);
      return shareResult;
    } catch (error) {
      const failResult: ShareResult = {
        success: false,
        message: 'Bir hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
      setResult(failResult);
      return failResult;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const shareTelegram = useCallback(async (
    packName: string,
    stickerUrls: string[]
  ): Promise<ShareResult> => {
    setIsSharing(true);
    setProgress(null);
    setResult(null);

    try {
      const shareResult = await shareToTelegram(
        packName,
        stickerUrls,
        setProgress
      );
      setResult(shareResult);
      return shareResult;
    } catch (error) {
      const failResult: ShareResult = {
        success: false,
        message: 'Bir hata oluştu',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
      setResult(failResult);
      return failResult;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const shareOther = useCallback(async (
    packName: string,
    description: string,
    url?: string
  ): Promise<ShareResult> => {
    setIsSharing(true);
    setResult(null);

    try {
      const shareResult = await shareGeneral(packName, description, url);
      setResult(shareResult);
      return shareResult;
    } catch (error) {
      const failResult: ShareResult = {
        success: false,
        message: 'Paylaşım iptal edildi',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      };
      setResult(failResult);
      return failResult;
    } finally {
      setIsSharing(false);
    }
  }, []);

  return {
    isSharing,
    progress,
    result,
    shareWhatsApp,
    shareTelegram,
    shareOther,
    reset
  };
}
