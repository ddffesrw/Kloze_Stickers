/**
 * Sticker Converter Service
 * PNG/JPG görsellerini WhatsApp ve Telegram için uygun formata çevirir
 */

export interface ConvertedSticker {
  webpBlob: Blob;
  webpDataUrl: string;
  width: number;
  height: number;
  sizeKB: number;
}

export interface StickerPackData {
  name: string;
  publisher: string;
  trayImage: string;
  stickers: Array<{
    imageData: string;
    emojis: string[];
  }>;
}

// WhatsApp sticker boyutları
const WHATSAPP_STICKER_SIZE = 512;
const WHATSAPP_TRAY_SIZE = 96;
const MAX_FILE_SIZE_KB = 100;

// Telegram sticker boyutları
const TELEGRAM_STICKER_SIZE = 512;

/**
 * Görseli belirtilen boyuta yeniden boyutlandırır
 */
async function resizeImage(
  imageUrl: string,
  targetSize: number
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context oluşturulamadı'));
        return;
      }
      
      // En-boy oranını koru
      let width = targetSize;
      let height = targetSize;
      
      if (img.width > img.height) {
        height = (img.height / img.width) * targetSize;
      } else {
        width = (img.width / img.height) * targetSize;
      }
      
      canvas.width = targetSize;
      canvas.height = targetSize;
      
      // Şeffaf arka plan
      ctx.clearRect(0, 0, targetSize, targetSize);
      
      // Görseli ortala
      const x = (targetSize - width) / 2;
      const y = (targetSize - height) / 2;
      
      ctx.drawImage(img, x, y, width, height);
      
      resolve(canvas);
    };
    
    img.onerror = () => reject(new Error('Görsel yüklenemedi'));
    img.src = imageUrl;
  });
}

/**
 * Canvas'ı WebP formatına çevirir ve sıkıştırır
 */
async function canvasToWebP(
  canvas: HTMLCanvasElement,
  maxSizeKB: number = MAX_FILE_SIZE_KB
): Promise<Blob> {
  let quality = 0.9;
  let blob: Blob | null = null;
  
  // Boyut sınırına uygun olana kadar kaliteyi düşür
  while (quality > 0.1) {
    blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', quality);
    });
    
    if (blob && blob.size / 1024 <= maxSizeKB) {
      break;
    }
    
    quality -= 0.1;
  }
  
  if (!blob) {
    throw new Error('WebP dönüştürme başarısız');
  }
  
  return blob;
}

/**
 * Tek bir görseli WhatsApp sticker formatına çevirir
 */
export async function convertToWhatsAppSticker(
  imageUrl: string
): Promise<ConvertedSticker> {
  const canvas = await resizeImage(imageUrl, WHATSAPP_STICKER_SIZE);
  const webpBlob = await canvasToWebP(canvas);
  
  const webpDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(webpBlob);
  });
  
  return {
    webpBlob,
    webpDataUrl,
    width: WHATSAPP_STICKER_SIZE,
    height: WHATSAPP_STICKER_SIZE,
    sizeKB: Math.round(webpBlob.size / 1024)
  };
}

/**
 * Tray ikonu için küçük görsel oluşturur
 */
export async function createTrayIcon(imageUrl: string): Promise<string> {
  const canvas = await resizeImage(imageUrl, WHATSAPP_TRAY_SIZE);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Tray ikonu oluşturulamadı'));
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      },
      'image/png',
      1
    );
  });
}

/**
 * Telegram için sticker dönüştürme
 */
export async function convertToTelegramSticker(
  imageUrl: string
): Promise<ConvertedSticker> {
  const canvas = await resizeImage(imageUrl, TELEGRAM_STICKER_SIZE);
  const webpBlob = await canvasToWebP(canvas, 512); // Telegram daha büyük boyuta izin verir
  
  const webpDataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(webpBlob);
  });
  
  return {
    webpBlob,
    webpDataUrl,
    width: TELEGRAM_STICKER_SIZE,
    height: TELEGRAM_STICKER_SIZE,
    sizeKB: Math.round(webpBlob.size / 1024)
  };
}

/**
 * Birden fazla görseli toplu olarak dönüştürür
 */
export async function convertMultipleStickers(
  imageUrls: string[],
  target: 'whatsapp' | 'telegram' = 'whatsapp',
  onProgress?: (current: number, total: number) => void
): Promise<ConvertedSticker[]> {
  const results: ConvertedSticker[] = [];
  const converter = target === 'whatsapp' 
    ? convertToWhatsAppSticker 
    : convertToTelegramSticker;
  
  for (let i = 0; i < imageUrls.length; i++) {
    const result = await converter(imageUrls[i]);
    results.push(result);
    onProgress?.(i + 1, imageUrls.length);
  }
  
  return results;
}

/**
 * WhatsApp sticker paketi JSON yapısı oluşturur
 */
export function createWhatsAppPackData(
  packName: string,
  publisher: string,
  trayImage: string,
  stickers: Array<{ imageData: string; emojis?: string[] }>
): StickerPackData {
  return {
    name: packName,
    publisher,
    trayImage,
    stickers: stickers.map((s) => ({
      imageData: s.imageData,
      emojis: s.emojis || ['😀']
    }))
  };
}
