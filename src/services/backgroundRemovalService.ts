/**
 * Background Removal Service
 * Client-side background removal via @imgly/background-removal
 * Maliyet optimizasyonu için Runware yerine tarayıcıda işlem yapılır.
 */

import { removeBackground as removeBackgroundImgly } from "@imgly/background-removal";

/**
 * Arka planı sil (@imgly/background-removal ile)
 */
export async function removeBackground(imageUrl: string): Promise<Blob> {
  try {
    console.log('[BackgroundService] Starting local background removal for:', imageUrl);

    // imgly blob döner
    const blob = await removeBackgroundImgly(imageUrl, {
      progress: (key, current, total) => {
        console.log(`[BackgroundService] Progress: ${key} ${current}/${total}`);
      },
      debug: true // Debug logs enabled as requested
    });

    console.log('[BackgroundService] Background removed successfully');
    return blob;

  } catch (error) {
    console.error('[BackgroundService] Error:', error);
    throw new Error(
      error instanceof Error
        ? `Arka plan silinemedi: ${error.message}`
        : 'Arka plan silme başarısız'
    );
  }
}

/**
 * Retry logic
 */
export async function removeBackgroundWithRetry(
  imageUrl: string,
  maxRetries: number = 2,
  retryDelay: number = 2000
): Promise<Blob> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await removeBackground(imageUrl);

    } catch (error) {
      if (attempt < maxRetries - 1) {
        console.log(`Background removal retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Background removal failed after retries');
}
