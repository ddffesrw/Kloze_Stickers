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

export interface UseStickerGenerationReturn {
  generate: (prompt: string, provider?: 'runware' | 'huggingface') => Promise<GeneratedStickerResult | null>;
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

  const [credits, setCredits] = useState(0);
  const [hasEnoughCredits, setHasEnoughCredits] = useState(false);

  /**
   * Credit'leri yenile
   */
  const refreshCredits = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setCredits(data.credits);
      setHasEnoughCredits((data.credits || 0) > 0);
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
    provider: 'runware' | 'huggingface' = 'runware'
  ): Promise<GeneratedStickerResult | null> => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    try {
      if (provider === 'runware' && credits < 1) {
        throw new Error('Yetersiz kredi');
      }

      const result = await generateAndUploadSticker(
        prompt,
        userId,
        undefined,
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