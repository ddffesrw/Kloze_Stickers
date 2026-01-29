
/**
 * Image Processing Utilities
 * Shared logic for compressing, converting, and resizing images.
 */

/**
 * Tray Icon (96x96 WebP) oluşturucu
 */
export async function createTrayIcon(sourceImageUrl: string): Promise<Blob> {
    const response = await fetch(sourceImageUrl);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    ctx.drawImage(img, 0, 0, 96, 96);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Tray icon creation failed')),
            'image/webp',
            0.8
        );
    });
}

/**
 * Thumbnail oluştur (128x128 WebP)
 */
export async function createThumbnail(blob: Blob): Promise<Blob> {
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
 * WebP formatına çevir (512x512)
 * WhatsApp standardı için
 */
export async function convertToWebP(blob: Blob): Promise<Blob> {
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
 * Helper: Compress Image to <300KB WebP (Max 512px)
 * Used for Admin Uploads mainly
 */
export async function compressImage(file: File): Promise<Blob> {
    const MAX_SIZE_BYTES = 300 * 1024; // 300KB
    const MAX_DIMENSION = 512;
    let quality = 0.85;

    const img = await createImageBitmap(file);

    let width = img.width;
    let height = img.height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
        } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    ctx.drawImage(img, 0, 0, width, height);

    let blob: Blob | null = null;

    // Attempt 1: High Quality
    blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));

    // Attempt 2: Medium Quality if too big
    if (blob && (blob.size > MAX_SIZE_BYTES)) {
        quality = 0.6;
        blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
    }

    // Attempt 3: Aggressive if still too big
    if (blob && (blob.size > MAX_SIZE_BYTES)) {
        quality = 0.4;
        blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
    }

    if (!blob) throw new Error("Compression failed");
    return blob;
}
