/**
 * Sticker Generation Service
 * Tam pipeline: Runware → Background Removal → WebP → Supabase
 */

import { generateSticker, type GenerateStickerOptions } from './runwareService';
import { generateStickerHF } from './forgeService';
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

    // Cost Logic: HF=1, Runware=3, Dalle=5
    let requiredCredits = 1; // Default HF
    if (provider === 'runware') requiredCredits = 3;
    if (provider === 'dalle') requiredCredits = 5;

    if ((creditAmount || 0) < requiredCredits) throw new Error(`Yetersiz kredi! Bu işlem için ${requiredCredits} kredi gerekiyor.`);

    // 1. AI ile görsel üret
    onProgress?.({
      stage: 'generating',
      progress: 10,
      message: provider === 'huggingface' ? 'Ücretsiz sunucuda üretiliyor...' : 'Yüksek kalite üretiliyor...'
    });

    let generated;
    if (provider === 'huggingface') {
      generated = await generateStickerHF({
        prompt,
        ...options
      });
    } else if (provider === 'dalle') {
      generated = await generateStickerDalle(prompt);
    } else {
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
        // Option 1: Try HF if provider was HF (or always try it first?)
        // Let's try local first as it's faster usually? Or HF as requested?
        // User asked for HF research. Let's try it.
        // Actually, stick to local @imgly as default for speed/privacy, 
        // but since user specifically asked "research HF for BG", let's hook it up.
        // Since we don't have a verified HF model returning image (RMBG returns masks often),
        // let's keep using the FIXED local one as primary for now to ensure stability.

        transparentBlob = await removeBackgroundWithRetry(generated.imageURL);

      } catch (bgError) {
        console.error("Local BG removal failed, trying fallback...", bgError);
        // Fallback logic could go here
        throw bgError;
      }

      onProgress?.({
        stage: 'removing_bg',
        progress: 60,
        message: 'Arka plan silindi!'
      });
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

    // 7. Kredi Düş
    if (requiredCredits > 0) {
      await supabase.rpc('deduct_credits', { amount: requiredCredits });
    }

    return {
      id: stickerId,
      imageUrl,
      thumbnailUrl,
      seed: generated.seed,
      width: 512,
      height: 512
    };

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
  if (provider === 'dalle') return 0.08; // ~$0.08 for HD
  return provider === 'runware' ? 0.02 : 0.00; // $0.02 vs Free
}
