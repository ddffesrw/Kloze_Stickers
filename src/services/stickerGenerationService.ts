/**
 * Sticker Generation Service
 * Tam pipeline: Runware → Background Removal → WebP → Supabase
 */

import { generateSticker, type GenerateStickerOptions } from './runwareService';
import { generateStickerHF } from './huggingFaceService';
import { removeBackgroundWithRetry } from './backgroundRemovalService';
import { supabase, storage } from '@/lib/supabase';

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
 * WebP formatına çevir (512x512)
 */
async function convertToWebP(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      // WhatsApp için kesinlikle 512x512
      canvas.width = 512;
      canvas.height = 512;

      // Resmi ortala ve ölçeklendir
      const scale = Math.max(512 / img.width, 512 / img.height);
      const x = (512 - img.width * scale) / 2;
      const y = (512 - img.height * scale) / 2;

      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // WebP olarak export (0.85 kalite = 100-200KB)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP dönüşümü başarısız'));
          }
        },
        'image/webp',
        0.85
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Thumbnail oluştur (128x128 WebP)
 */
async function createThumbnail(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    img.onload = () => {
      canvas.width = 128;
      canvas.height = 128;

      const scale = Math.max(128 / img.width, 128 / img.height);
      const x = (128 - img.width * scale) / 2;
      const y = (128 - img.height * scale) / 2;

      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Thumbnail oluşturulamadı')),
        'image/webp',
        0.7
      );
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

/**
 * Supabase'e yükle
 */
async function uploadToSupabase(
  blob: Blob,
  userId: string,
  fileName: string,
  bucket: string = 'stickers'
): Promise<string> {
  const filePath = `${userId}/${Date.now()}_${fileName}`;

  await storage.upload(bucket, filePath, blob);

  return storage.getPublicUrl(bucket, filePath);
}

/**
 * TAM PIPELINE: AI Generation → BG Removal → WebP → Supabase
 */
export async function generateAndUploadSticker(
  prompt: string,
  userId: string,
  options?: Partial<GenerateStickerOptions>,
  onProgress?: (progress: GenerationProgress) => void,
  provider: 'runware' | 'huggingface' = 'runware'
): Promise<GeneratedStickerResult> {
  try {
    // 0. Kredi Kontrolü
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError || !userData) throw new Error("Kullanıcı bilgisi alınamadı");
    if ((userData.credits || 0) < 1) throw new Error("Yetersiz kredi! Lütfen kredi yükleyin.");

    // 1. AI ile görsel üret
    onProgress?.({
      stage: 'generating',
      progress: 10,
      message: provider === 'huggingface' ? 'Ücretsiz sunucuda üretiliyor...' : 'Hızlı sunucuda üretiliyor...'
    });

    let generated;
    if (provider === 'huggingface') {
      generated = await generateStickerHF({
        prompt,
        ...options
      });
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
    onProgress?.({
      stage: 'removing_bg',
      progress: 40,
      message: 'Arka plan siliniyor...'
    });

    const transparentBlob = await removeBackgroundWithRetry(generated.imageURL);

    onProgress?.({
      stage: 'removing_bg',
      progress: 60,
      message: 'Arka plan silindi!'
    });

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

    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToSupabase(webpBlob, userId, 'sticker.webp', 'stickers'),
      uploadToSupabase(thumbnailBlob, userId, 'thumb.webp', 'thumbnails')
    ]);

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
    await supabase.rpc('deduct_credits', { amount: 1 });

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
export function estimateCost(provider: 'runware' | 'huggingface'): number {
  return provider === 'runware' ? 0.02 : 0.00; // $0.02 vs Free
}
