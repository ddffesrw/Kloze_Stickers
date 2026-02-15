/**
 * Background Removal Service (Free - Multiple Methods)
 * Priority: 
 * 1. Local @imgly (works in browser, no CORS issues)
 * 2. HuggingFace Inference API (may have CORS issues in browser)
 * 3. Gradio Space API (fallback)
 */

// HF Space URL from env
const HF_SPACE_URL = import.meta.env.VITE_HF_SPACE_URL || 'https://ddffesrw-sticker-processor.hf.space';
const HF_TOKEN = import.meta.env.VITE_HUGGING_FACE_TOKEN || '';

/**
 * Convert Blob to Base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Arka planı sil (ÜCRETSİZ)
 * Optimized for Speed: HF API first (server-side), then local fallback.
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

  // ========== LOCAL @imgly WITH TIMEOUT (WASM can hang on mobile) ==========
  try {
    console.log('[BackgroundService] 🎯 Using local @imgly...');

    const BG_REMOVAL_TIMEOUT_MS = 45000; // 45 seconds (WASM + model download can take time on first run)

    const imageUrl = URL.createObjectURL(imageBlob);
    try {
      // Wrap EVERYTHING (dynamic import + processing) inside the timeout
      let timeoutId: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Background removal timeout (45s)')), BG_REMOVAL_TIMEOUT_MS);
      });

      const processingPromise = (async () => {
        const { removeBackground: removeBackgroundImgly } = await import("@imgly/background-removal");
        return removeBackgroundImgly(imageUrl, {
          publicPath: '/imgly/', // Force usage of local assets (copied via vite-plugin-static-copy)
          progress: (key, current, total) => {
            console.log(`[BG] ${key}: ${Math.round((current / total) * 100)}%`);
          },
          debug: false,
          model: 'isnet_fp16', // Fast FP16 model (smaller than quint8 for this lib)
          output: {
            format: 'image/png',
            quality: 0.8, // Slightly reduce quality for speed
          }
        });
      })();

      const result = await Promise.race([processingPromise, timeoutPromise]);
      clearTimeout(timeoutId!); // Clean up timer on success

      console.log('[BackgroundService] ✅ Local @imgly succeeded');
      return result;
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  } catch (localError) {
    console.warn('[BackgroundService] ⚠️ Local @imgly failed:', localError);
  }

  // ========== METHOD 3: Gradio Space API (Last Resort) ==========
  try {
    console.log('[BackgroundService] Trying Gradio Space API...');

    const base64Image = await blobToBase64(imageBlob);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for API

    const response = await fetch(`${HF_SPACE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [base64Image]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.json();
      if (result.data && result.data[0]) {
        const base64Result = result.data[0];
        const base64Data = base64Result.split(',')[1] || base64Result;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        console.log('[BackgroundService] ✅ Gradio Space API succeeded');
        return new Blob([bytes], { type: 'image/png' });
      }
    }

    console.warn('[BackgroundService] Gradio Space API failed');
  } catch (gradioError) {
    console.warn('[BackgroundService] ⚠️ Gradio Space error:', gradioError);
  }

  // All methods failed - throw so caller knows it failed
  console.error('[BackgroundService] ❌ All methods failed');
  throw new Error('Arka plan silme başarısız oldu. Orijinal görsel kullanılacak.');
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
