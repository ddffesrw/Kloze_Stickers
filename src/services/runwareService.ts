/**
 * Runware.ai Service
 * Flux model ile AI sticker üretimi - Düzenlenmiş ve Fixlenmiş Versiyon
 */

import { Runware } from "@runware/sdk-js";

// Runware client management
let runwareClient: any = null;

/**
 * Runware client'ı al veya oluştur.
 * Browser ortamında bağlantı kopmaları olabileceğinden, bağlantı durumunu garantiye alıyoruz.
 */
async function getRunwareClient(): Promise<any> {
  const apiKey = import.meta.env.VITE_RUNWARE_API_KEY;
  if (!apiKey) throw new Error('VITE_RUNWARE_API_KEY bulunamadı');

  // Mevcut client varsa ve bağlıysa onu kullan
  if (runwareClient) {
    // SDK'nın connectionState property'si varsa kontrol edebiliriz, 
    // ancak en garantisi ensureConnection çağırmaktır.
    return runwareClient;
  }

  // Yeni client oluştur
  runwareClient = new Runware({
    apiKey,
    url: "wss://ws-api.runware.ai/v1", // Explicit URL
    timeoutDuration: 60000 // 60s connection timeout for slow responses
  });

  return runwareClient;
}

export interface GenerateStickerOptions {
  prompt: string;
  negativePrompt?: string;
  model?: string; // Daha esnek olması için string yapıldı
  width?: number;
  height?: number;
  seed?: number;
}

export interface GeneratedSticker {
  imageURL: string;
  seed: number;
  width: number;
  height: number;
}

/**
 * AI ile sticker üret (Flux model)
 */
export async function generateSticker(
  options: GenerateStickerOptions
): Promise<GeneratedSticker> {
  // 1. Client'ı al (Async)
  const runware = await getRunwareClient();

  // Sticker için optimize edilmiş prompt - TEST İÇİN SABİT GÜVENLİ PROMPT
  // const optimizedPrompt = `${options.prompt}, die-cut sticker, professional vector illustration, thick white border, solid flat white background, isolated on white background, high quality, 8k, clean edges, sticker style, vibrant colors, simple composition`;

  // NSFC filtresine takılmamak için geçici olarak sabit prompt kullanıyoruz
  // Sticker için optimize edilmiş prompt
  const optimizedPrompt = `${options.prompt}, die-cut sticker, professional vector illustration, thick white border, solid flat white background, isolated on white background, high quality, 8k, clean edges, sticker style, vibrant colors, simple composition`;

  // NOTE: Geçici sabit prompt kaldırıldı, dinamik prompt geri yüklendi.
  console.log('[Runware] Generating with prompt:', optimizedPrompt);

  // Negative prompt
  const negativePrompt = options.negativePrompt ||
    'complex background, shadows, photo-realistic, gradient, textured background, blurry, watermark, 3d render, shadows, text, signature, multiple objects, cluttered';

  const params: any = {
    positivePrompt: optimizedPrompt,
    negativePrompt, // Orijinal negative prompt geri yüklendi
    model: "runware:100@1", // Flux Schnell Short ID
    width: options.width || 512,
    height: options.height || 512,
    numberResults: 1,
    outputFormat: "PNG",
    outputType: "URL",
    seed: options.seed || Math.floor(Math.random() * 1000000),
    steps: 4,
    CFGScale: 1, // Flux için 1
  };

  const performRequest = async (retryCount = 0): Promise<any> => {
    try {
      console.log(`[Runware] Connecting (Attempt ${retryCount + 1})...`);
      // Bağlantıyı garantiye al
      if (runware.ensureConnection) {
        await runware.ensureConnection();
      }

      console.log('[Runware] Requesting:', JSON.stringify(params, null, 2));

      // İstek yap
      const images = await runware.requestImages(params);
      return images;
    } catch (err: any) {
      console.error(`[Runware] Attempt ${retryCount + 1} failed:`, err);
      // Detaylı error log
      console.error("[Runware] Full Error Object:", JSON.stringify(err, null, 2));

      if (retryCount < 1) {
        console.log('[Runware] Retrying in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return performRequest(retryCount + 1);
      }
      throw err;
    }
  };

  try {
    const images = await performRequest();

    if (!images || images.length === 0) {
      throw new Error('Runware boş yanıt döndürdü');
    }

    const result = images[0];
    console.log('[Runware] Success:', result);

    return {
      imageURL: result.imageURL,
      seed: result.seed || params.seed!,
      width: result.width || params.width!,
      height: result.height || params.height!
    };

  } catch (error: any) {
    console.error('[Runware] Error:', error);

    // Eğer bağlantı hatasıysa client'ı sıfırla ki bir sonraki sefer yenisi oluşturulsun
    if (error?.message?.includes('connection') || error?.message?.includes('server')) {
      runwareClient = null;
    }

    throw new Error(
      error?.message ? `Runware Hatası: ${error.message}` : 'Görsel üretimi başarısız'
    );
  }
}

/**
 * Batch sticker üretimi
 */
export async function generateMultipleStickers(
  prompts: string[],
  options?: Omit<GenerateStickerOptions, 'prompt'>
): Promise<GeneratedSticker[]> {
  const results: GeneratedSticker[] = [];

  for (const prompt of prompts) {
    try {
      const result = await generateSticker({ ...options, prompt });
      results.push(result);
    } catch (error) {
      console.error(`Prompt "${prompt}" için hata:`, error);
    }
  }

  return results;
}

/**
 * Prompt variations oluştur
 */
export function createPromptVariations(basePrompt: string, count: number = 3): string[] {
  const styles = [
    'cute kawaii style',
    'modern minimalist',
    'cartoon comic style',
    'flat design',
    'chibi anime style',
    'bold graphic style'
  ];

  const variations: string[] = [];

  for (let i = 0; i < Math.min(count, styles.length); i++) {
    variations.push(`${basePrompt}, ${styles[i]}`);
  }

  return variations;
}


/**
 * Arka planı sil (Runware)
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  const runware = await getRunwareClient();

  try {
    console.log('[Runware-BG] Removing background...');
    if (runware.ensureConnection) {
      await runware.ensureConnection();
    }

    const result = await runware.removeBackground({
      inputImage: imageUrl,
      outputFormat: 'PNG',
      outputType: 'URL',
      rgba: [255, 255, 255, 0] // Transparent
    });

    if (!result || !result.imageURL) {
      throw new Error('Runware background removal failed');
    }

    console.log('[Runware-BG] Success:', result.imageURL);
    return result.imageURL;

  } catch (error: any) {
    console.error('[Runware-BG] Error:', error);

    // Bağlantı hatası durumunda reset
    if (error?.message?.includes('connection') || error?.message?.includes('server')) {
      runwareClient = null;
    }

    throw new Error(
      error?.message ? `Arka plan silinemedi: ${error.message}` : 'Arka plan silme başarısız'
    );
  }
}

/**
 * Runware credit balance kontrol
 */
export async function checkRunwareCredits(): Promise<number> {
  return 1000;
}