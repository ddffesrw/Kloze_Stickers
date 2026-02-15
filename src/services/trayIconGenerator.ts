/**
 * Tray Icon Generator
 * WhatsApp için profesyonel 96x96 PNG tray icon oluşturur
 */

/**
 * Sticker'dan profesyonel tray icon oluştur
 * - Beyaz arka plan
 * - %80 boyutunda ortala
 * - 96x96 PNG
 */
export async function createTrayIconFromSticker(
  stickerUrl: string,
  backgroundColor: string = '#FFFFFF'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context oluşturulamadı'));
        return;
      }

      // 1. Beyaz arka plan
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 96, 96);

      // 2. Sticker'ı %80 boyutunda ortala
      const targetSize = 96 * 0.8; // 76.8 piksel
      const scale = Math.min(targetSize / img.width, targetSize / img.height);

      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      const x = (96 - scaledWidth) / 2;
      const y = (96 - scaledHeight) / 2;

      // 3. Anti-aliasing için smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 4. Sticker'ı çiz
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      // 5. PNG olarak export
      // WhatsApp Tray Icon Limiti: < 50 KB
      // PNG sıkıştırma kontrolü tarayıcıda sınırlı olduğu için canvas boyutunu küçük tutuyoruz (96x96 zaten küçük)
      // Ancak yine de blob size kontrolü iyi olur.
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 50KB kontrolü
            if (blob.size > 50 * 1024) {
              console.warn('Tray icon > 50KB. WhatsApp reddedebilir.', blob.size);
              // Eğer çok büyükse, kalite parametresi PNG için genelde çalışmaz ama
              // canvas'ı küçültmeyi deneyebiliriz veya başka bir format (fakat WA PNG istiyor).
              // 96x96 PNG'nin 50KB'ı geçmesi çok zor (ancak çok gürültülü görsel ise olabilir).
            }
            resolve(blob);
          } else {
            reject(new Error('PNG dönüşümü başarısız'));
          }
        },
        'image/png'
        // PNG için kalite parametresi standartta yok
      );
    };

    img.onerror = () => reject(new Error('Resim yüklenemedi'));
    img.src = stickerUrl;
  });
}

/**
 * Tray icon'u Base64 string'e çevir
 */
export async function createTrayIconBase64(
  stickerUrl: string,
  backgroundColor: string = '#FFFFFF'
): Promise<string> {
  const blob = await createTrayIconFromSticker(stickerUrl, backgroundColor);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Base64 dönüşümü başarısız'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Custom tray icon oluştur (grid layout)
 * İlk 4 sticker'ı 2x2 grid'de gösterir
 */
export async function createGridTrayIcon(
  stickerUrls: string[],
  backgroundColor: string = '#FFFFFF'
): Promise<Blob> {
  if (stickerUrls.length === 0) {
    throw new Error('En az 1 sticker gerekli');
  }

  // Tek sticker varsa normal tray icon oluştur
  if (stickerUrls.length === 1) {
    return createTrayIconFromSticker(stickerUrls[0], backgroundColor);
  }

  return new Promise(async (resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context oluşturulamadı'));
        return;
      }

      // Beyaz arka plan
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 96, 96);

      // İlk 4 sticker'ı al
      const gridStickers = stickerUrls.slice(0, 4);
      const cellSize = 96 / 2;  // 48x48 her hücre

      // Sticker'ları yükle
      const images = await Promise.all(
        gridStickers.map(url => loadImage(url))
      );

      // 2x2 grid'de çiz
      const positions = [
        { x: 0, y: 0 },       // Sol üst
        { x: 48, y: 0 },      // Sağ üst
        { x: 0, y: 48 },      // Sol alt
        { x: 48, y: 48 }      // Sağ alt
      ];

      images.forEach((img, index) => {
        const pos = positions[index];
        const scale = Math.min(cellSize / img.width, cellSize / img.height) * 0.9;  // %90 boyut

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;

        const x = pos.x + (cellSize - scaledWidth) / 2;
        const y = pos.y + (cellSize - scaledHeight) / 2;

        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
      });

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('PNG dönüşümü başarısız')),
        'image/png',
        1.0
      );

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Helper: Image yükle
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Rounded corners ile tray icon
 */
export async function createRoundedTrayIcon(
  stickerUrl: string,
  backgroundColor: string = '#FFFFFF',
  borderRadius: number = 16
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 96;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context oluşturulamadı'));
        return;
      }

      // Rounded rectangle path
      ctx.beginPath();
      ctx.moveTo(borderRadius, 0);
      ctx.lineTo(96 - borderRadius, 0);
      ctx.quadraticCurveTo(96, 0, 96, borderRadius);
      ctx.lineTo(96, 96 - borderRadius);
      ctx.quadraticCurveTo(96, 96, 96 - borderRadius, 96);
      ctx.lineTo(borderRadius, 96);
      ctx.quadraticCurveTo(0, 96, 0, 96 - borderRadius);
      ctx.lineTo(0, borderRadius);
      ctx.quadraticCurveTo(0, 0, borderRadius, 0);
      ctx.closePath();

      // Clip to rounded rectangle
      ctx.clip();

      // Beyaz arka plan
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 96, 96);

      // Sticker'ı ortala
      const targetSize = 96 * 0.8;
      const scale = Math.min(targetSize / img.width, targetSize / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const x = (96 - scaledWidth) / 2;
      const y = (96 - scaledHeight) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('PNG dönüşümü başarısız')),
        'image/png',
        1.0
      );
    };

    img.onerror = () => reject(new Error('Resim yüklenemedi'));
    img.src = stickerUrl;
  });
}
