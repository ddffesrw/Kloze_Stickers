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

  // ========== LOCAL @imgly ONLY (HF API has CORS issues from browser) ==========
  try {
    console.log('[BackgroundService] 🎯 Using local @imgly...');

    const { removeBackground: removeBackgroundImgly } = await import("@imgly/background-removal");

    const imageUrl = URL.createObjectURL(imageBlob);
    const result = await removeBackgroundImgly(imageUrl, {
      progress: (key, current, total) => {
        // Silenced for speed, or emit to console if debugging
        // console.log(`[BG] ${key}: ${Math.round((current / total) * 100)}%`);
      },
      debug: false,
      model: 'isnet_fp16', // Fast FP16 model (smaller than quint8 for this lib)
      output: {
        format: 'image/png',
        quality: 0.8, // Slightly reduce quality for speed
      }
    });
    URL.revokeObjectURL(imageUrl);

    console.log('[BackgroundService] ✅ Local @imgly succeeded');
    return result;
  } catch (localError) {
    console.warn('[BackgroundService] ⚠️ Local @imgly failed:', localError);
  }

  // ========== METHOD 3: Gradio Space API (Last Resort) ==========
  try {
    console.log('[BackgroundService] Trying Gradio Space API...');

    const base64Image = await blobToBase64(imageBlob);

    const response = await fetch(`${HF_SPACE_URL}/api/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [base64Image]
      })
    });

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

  // All methods failed - return original image
  console.warn('[BackgroundService] ❌ All methods failed, returning original image');
  return imageBlob;
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

  // All retries failed, return original image
  console.error('[BackgroundService] All retries failed, returning original image');

  if (imageUrl instanceof Blob) {
    return imageUrl;
  } else {
    const response = await fetch(imageUrl);
    return await response.blob();
  }
}
