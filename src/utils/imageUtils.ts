
/**
 * Image Processing Utilities
 * Shared logic for compressing, converting, and resizing images.
 */

/**
 * Tray Icon (High Res 512x512 WebP)
 * Apps displays this, so it needs to be high quality
 */
export async function createTrayIcon(sourceImageUrl: string): Promise<Blob> {
    const response = await fetch(sourceImageUrl);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    ctx.drawImage(img, 0, 0, 512, 512);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Tray icon creation failed')),
            'image/webp',
            0.85
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
export async function compressImage(file: File | Blob, startQuality: number = 0.85, maxDimension: number = 512): Promise<Blob> {
    const MAX_SIZE_BYTES = 300 * 1024; // 300KB
    let quality = startQuality;

    const img = await createImageBitmap(file);

    let width = img.width;
    let height = img.height;

    if (width > maxDimension || height > maxDimension) {
        if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
        } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
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

/**
 * Helper: Crop Image (react-easy-crop)
 * Returns a 512x512 WebP Blob
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous') // needed to avoid cross-origin issues on CodeSandbox
        image.src = url
    })

export function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180
}

export function rotateSize(width: number, height: number, rotation: number) {
    const rotRad = getRadianAngle(rotation)

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    }
}

export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: { x: number; y: number; width: number; height: number },
    rotation = 0,
    flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return null
    }

    const rotRad = getRadianAngle(rotation)

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    )

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth
    canvas.height = bBoxHeight

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotRad)
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
    ctx.translate(-image.width / 2, -image.height / 2)

    // draw rotated image
    ctx.drawImage(image, 0, 0)

    // croppedAreaPixels values are bounding-box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    )

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0)

    // As a blob (Force 512x512 Resize final)
    const finalCanvas = document.createElement('canvas')
    finalCanvas.width = 512
    finalCanvas.height = 512
    const finalCtx = finalCanvas.getContext('2d')
    if (!finalCtx) return null;

    finalCtx.drawImage(canvas, 0, 0, 512, 512);

    return new Promise((resolve, reject) => {
        finalCanvas.toBlob((file) => {
            resolve(file)
        }, 'image/webp', 0.9)
    })
}
