/**
 * Sticker Generation Service
 * Tam pipeline: Runware → Background Removal → WebP → Supabase
 */

import { generateSticker, removeBackground as runwareRemoveBg, type GenerateStickerOptions } from './runwareService';

import { generateStickerDalle } from './openAiService';
import { removeBackgroundWithRetry } from './backgroundRemovalService';
import { supabase } from '@/lib/supabase';
import { storageService, BUCKETS } from './storageService';
import { convertToWebP, createThumbnail } from '@/utils/imageUtils';

export interface GenerationProgress {
  stage: 'generating' | 'removing_bg' | 'converting' | 'uploading' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface GeneratedStickerResult {
  id: string;
  imageUrl: string;
  thumbnailUrl: string;
  seed: number;
  width: number;
  height: number;
}

/**
 * TAM PIPELINE: AI Generation → BG Removal → WebP → Supabase
 */
export async function generateAndUploadSticker(
  prompt: string,
  userId: string,
  options?: Partial<GenerateStickerOptions>,
  removeBg: boolean = true,
  onProgress?: (progress: GenerationProgress) => void,
  provider: 'runware' | 'huggingface' | 'dalle' = 'runware'
): Promise<GeneratedStickerResult> {
  try {
    // 0. Kredi Kontrolü (RPC ile - RLS Bypass)
    const { data: creditAmount, error: creditError } = await supabase.rpc('get_user_credits');

    if (creditError) {
      console.error("Credit check failed:", creditError);
      throw new Error("Kredi bilgisi alınamadı");
    }

    // Cost Logic: HF=1, Runware=3, Dalle=10 (Pro only)
    let requiredCredits = 1; // Default HF
    if (provider === 'runware') requiredCredits = 3;
    if (provider === 'dalle') requiredCredits = 10;

    if ((creditAmount || 0) < requiredCredits) throw new Error(`Yetersiz kredi! Bu işlem için ${requiredCredits} kredi gerekiyor.`);

    // Kredi düşülmüyor henüz - tüm pipeline başarılı olduktan SONRA düşülecek

    try {
    // 1. AI ile görsel üret
    onProgress?.({
      stage: 'generating',
      progress: 10,
      message: provider === 'huggingface' ? 'Ücretsiz sunucuda üretiliyor...' : 'Yüksek kalite üretiliyor...'
    });

    let generated;
    if (provider === 'dalle') {
      generated = await generateStickerDalle(prompt);
    } else {
      // Default / Runware
      generated = await generateSticker({
        prompt,
        ...options
      });
    }

    onProgress?.({
      stage: 'generating',
      progress: 30,
      message: 'Görsel üretildi!'
    });


    // 2. Arka planı sil
    let transparentBlob: Blob;

    if (removeBg) {
      onProgress?.({
        stage: 'removing_bg',
        progress: 40,
        message: 'Arka plan siliniyor...'
      });

      try {
        // Always use local @imgly BG removal (free, runs in browser via WASM)
        // Runware's server-side BG removal costs extra API credits - unnecessary
        console.log('[Generation] Using local @imgly BG removal...');
        transparentBlob = await removeBackgroundWithRetry(generated.imageURL);

        onProgress?.({
          stage: 'removing_bg',
          progress: 60,
          message: 'Arka plan silindi!'
        });

      } catch (bgError) {
        console.error("BG removal failed, falling back to original...", bgError);

        // FALLBACK: Use original image so user doesn't lose credit/sticker
        onProgress?.({
          stage: 'removing_bg',
          progress: 60,
          message: 'Arka plan silinemedi, orijinali kullanılıyor...'
        });

        const response = await fetch(generated.imageURL);
        transparentBlob = await response.blob();
      }
    } else {
      // Skip removal, fetch original image as blob if needed
      onProgress?.({
        stage: 'removing_bg',
        progress: 50,
        message: 'Arka plan silme atlanıyor...'
      });

      const response = await fetch(generated.imageURL);
      transparentBlob = await response.blob();
    }

    // 3. WebP formatına çevir (512x512)
    onProgress?.({
      stage: 'converting',
      progress: 70,
      message: 'WebP formatına çevriliyor...'
    });

    const webpBlob = await convertToWebP(transparentBlob);

    // 4. Thumbnail oluştur
    const thumbnailBlob = await createThumbnail(transparentBlob);

    onProgress?.({
      stage: 'converting',
      progress: 80,
      message: 'Format dönüşümü tamamlandı!'
    });

    // 5. Supabase'e yükle
    onProgress?.({
      stage: 'uploading',
      progress: 85,
      message: 'Supabase\'e yükleniyor...'
    });

    // Parallel upload
    const uploadPromises = [
      storageService.upload(BUCKETS.STICKERS, `${userId}/${Date.now()}_sticker.webp`, webpBlob),
      storageService.upload(BUCKETS.THUMBNAILS, `${userId}/${Date.now()}_thumb.webp`, thumbnailBlob)
    ];

    const [stickerUpload, thumbUpload] = await Promise.all(uploadPromises);
    const imageUrl = stickerUpload.publicUrl;
    const thumbnailUrl = thumbUpload.publicUrl;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Sticker hazır!'
    });

    // 6. Veritabanına kaydet
    const stickerId = crypto.randomUUID();

    await supabase.from('user_stickers').insert({
      id: stickerId,
      user_id: userId,
      image_url: imageUrl,
      thumbnail_url: thumbnailUrl,
      prompt,
      seed: generated.seed,
      width: 512,
      height: 512,
      size_bytes: webpBlob.size // Add file size
    });

    // Pipeline tamamen başarılı - şimdi krediyi düş
    if (requiredCredits > 0) {
      const { error: deductError } = await supabase.rpc('deduct_credits', { amount: requiredCredits });
      if (deductError) {
        console.error('[Generation] Credit deduction failed after success:', deductError);
      }
    }

    return {
      id: stickerId,
      imageUrl,
      thumbnailUrl,
      seed: generated.seed,
      width: 512,
      height: 512
    };

    } catch (pipelineError) {
      // Pipeline failed - no credit was deducted, nothing to refund
      throw pipelineError;
    }

  } catch (error) {
    console.error('Sticker generation pipeline error:', error);
    throw error;
  }
}

/**
 * Batch sticker generation
 */
export async function generateMultipleStickers(
  prompts: string[],
  userId: string,
  onProgress?: (current: number, total: number, progress: GenerationProgress) => void
): Promise<GeneratedStickerResult[]> {
  const results: GeneratedStickerResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    try {
      const result = await generateAndUploadSticker(
        prompts[i],
        userId,
        undefined,
        true, // Batch default removeBg=true for now
        (progress) => onProgress?.(i + 1, prompts.length, progress),
        'runware' // Batch şimdilik sadece Runware
      );

      results.push(result);
    } catch (error) {
      console.error(`Prompt "${prompts[i]}" için hata:`, error);
      // Devam et
    }
  }

  return results;
}

/**
 * Estimate Generation Cost
 * Provider'a göre maliyet hesabı (Temsili)
 */
export function estimateCost(provider: 'runware' | 'huggingface' | 'dalle'): number {
  if (provider === 'dalle') return 0.04; // ~$0.04 standard quality
  return provider === 'runware' ? 0.0013 : 0.00; // BG removal is free (local @imgly)
}
