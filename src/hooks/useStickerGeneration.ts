/**
 * useStickerGeneration Hook - REAL MODE
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  generateAndUploadSticker,
  type GenerationProgress,
  type GeneratedStickerResult
} from '@/services/stickerGenerationService';
import { consumeRateLimit, RATE_LIMITS, formatResetTime } from '@/services/rateLimitService';

export interface UseStickerGenerationReturn {
  generate: (prompt: string, provider?: 'runware' | 'huggingface' | 'dalle', removeBg?: boolean) => Promise<GeneratedStickerResult | null>;
  isGenerating: boolean;
  progress: GenerationProgress | null;
  error: string | null;
  credits: number;
  hasEnoughCredits: boolean;
  refreshCredits: () => Promise<void>;
  resetError: () => void;
}

export function useStickerGeneration(userId: string): UseStickerGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [credits, setCredits] = useState<number | null>(null); // null = loading
  const [hasEnoughCredits, setHasEnoughCredits] = useState(true); // Default true to prevent flash

  /**
   * Credit'leri yenile
   */
  const refreshCredits = useCallback(async () => {
    if (!userId) return;

    // Use RPC to avoid 403/RLS issues
    const { data: creditBalance, error } = await supabase.rpc('get_user_credits');

    if (!error) {
      const balance = creditBalance || 0;
      setCredits(balance);
      setHasEnoughCredits(balance > 0);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  /**
   * Sticker üret
   */
  const generate = useCallback(async (
    prompt: string,
    provider: 'runware' | 'huggingface' | 'dalle' = 'runware',
    removeBg: boolean = true
  ): Promise<GeneratedStickerResult | null> => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    try {
      // Rate limit kontrolü
      const { allowed, result: rateResult } = await consumeRateLimit(
        userId,
        RATE_LIMITS.STICKER_GENERATION
      );

      if (!allowed) {
        throw new Error(`Çok fazla istek! ${formatResetTime(rateResult.resetAt)} sonra tekrar dene.`);
      }

      const requiredCredits = provider === 'dalle' ? 5 : (provider === 'runware' ? 3 : 1);
      if (credits < requiredCredits) {
        throw new Error(`Yetersiz kredi. Bu işlem ${requiredCredits} kredi gerektirir.`);
      }

      const result = await generateAndUploadSticker(
        prompt,
        userId,
        undefined,
        removeBg,
        (prog) => setProgress(prog),
        provider
      );

      // Başarılı ise krediyi güncelle (Service düşürdü, biz güncel değeri çekelim)
      await refreshCredits();

      return result;

    } catch (err: any) {
      const errorMessage = err?.message || 'Bilinmeyen hata';
      setError(errorMessage);
      console.error('Generation error:', err);
      return null;

    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [userId, credits, refreshCredits]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generate,
    isGenerating,
    progress,
    error,
    credits,
    hasEnoughCredits,
    refreshCredits,
    resetError
  };
}