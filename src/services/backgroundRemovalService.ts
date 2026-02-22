/**
 * Background Removal Service (Free - Multiple Methods)
 * Priority: 
 * 1. Local @imgly (works in browser, no CORS issues)
 * 2. HuggingFace Inference API (may have CORS issues in browser)
 * 3. Gradio Space API (fallback)
 */
const VDS_API_URL = 'http://94.154.34.214:8000/api/v1/remove-bg';

/**
 * Arka planı sil (VDS API)
 * Optimized for Speed and small APK size.
 */
export async function removeBackground(input: string | Blob): Promise<Blob> {
  let imageBlob: Blob;

  // Convert input to Blob if it's a URL
  if (typeof input === 'string') {
    try {
      const response = await fetch(input);
      if (!response.ok) throw new Error('Image fetch failed');
      imageBlob = await response.blob();
    } catch (error) {
      console.error('[BackgroundService] Could not fetch image:', error);
      throw new Error('Görsel indirilemedi');
    }
  } else {
    imageBlob = input;
  }

  try {
    console.log('[BackgroundService] 🚀 VDS API kullanılıyor...');

    // FormData ile görseli API'ye gönderiyoruz
    const formData = new FormData();
    formData.append('image', imageBlob, 'image.jpg');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(VDS_API_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[BackgroundService] ✅ VDS API başarılı');
      return await response.blob(); // API returns PNG blob directly
    } else {
      console.error('[BackgroundService] VDS API hatası:', response.statusText);
      throw new Error(`API Hatası: ${response.status}`);
    }
  } catch (error) {
    console.error('[BackgroundService] ❌ VDS API işlemi başarısız:', error);
    throw new Error('Arka plan silme başarısız oldu. Lütfen tekrar deneyin.');
  }
}

/**
 * Retry logic with exponential backoff
 */
export async function removeBackgroundWithRetry(
  imageUrl: string | Blob,
  maxRetries: number = 1 // Reduced for speed
): Promise<Blob> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await removeBackground(imageUrl);
    } catch (error: any) {
      lastError = error;
      console.warn(`[BackgroundService] Attempt ${attempt + 1} failed:`, error.message);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  // All retries failed - throw so caller can handle gracefully
  console.error('[BackgroundService] All retries failed');
  throw lastError || new Error('Arka plan silme tüm denemelerde başarısız oldu');
}
