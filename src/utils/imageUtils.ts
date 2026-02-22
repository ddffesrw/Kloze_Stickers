
/**
 * Image Processing Utilities
 * Shared logic for compressing, converting, and resizing images.
 */

/**
 * Check if a WebP blob is animated
 * Reads WebP header to detect VP8X chunk with animation flag
 */
export async function isWebPAnimated(blob: Blob): Promise<boolean> {
    try {
        // Read first 21 bytes (enough for VP8X header check)
        const arrayBuffer = await blob.slice(0, 21).arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        // Check RIFF header
        if (bytes.length < 21) return false;
        if (bytes[0] !== 0x52 || bytes[1] !== 0x49 || bytes[2] !== 0x46 || bytes[3] !== 0x46) return false; // "RIFF"

        // Check WEBP signature
        if (bytes[8] !== 0x57 || bytes[9] !== 0x45 || bytes[10] !== 0x42 || bytes[11] !== 0x50) return false; // "WEBP"

        // Check for VP8X chunk (extended format with animation support)
        if (bytes[12] === 0x56 && bytes[13] === 0x50 && bytes[14] === 0x38 && bytes[15] === 0x58) { // "VP8X"
            const flags = bytes[20];
            const isAnimated = (flags & 0x02) !== 0; // Bit 1 = animation flag
            return isAnimated;
        }

        return false;
    } catch (e) {
        console.error('Error checking WebP animation:', e);
        return false;
    }
}

/**
 * Tray Icon (Strictly 96x96, < 50KB, PNG or WebP)
 * WhatsApp Requirement: 96x96 pixels, < 50KB
 * Note: Tray icon is always static (even for animated packs) - uses first frame
 */
export async function createTrayIcon(sourceImageUrl: string): Promise<Blob> {
    const response = await fetch(sourceImageUrl);
    const blob = await response.blob();

    // For animated WebP, createImageBitmap returns first frame - perfect for tray icon
    const img = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    ctx.drawImage(img, 0, 0, 96, 96);

    // Try high quality first
    let quality = 0.8;
    let resultBlob: Blob | null = null;

    // Attempt to keep under 50KB
    while (quality > 0.1) {
        resultBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png', quality)); // PNG preferred for tray
        if (resultBlob && resultBlob.size < 50 * 1024) break;
        quality -= 0.1;
    }

    if (!resultBlob) throw new Error("Tray icon creation failed");
    return resultBlob;
}

/**
 * Thumbnail oluştur (128x128 WebP)
 */
export async function createThumbnail(blob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
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

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });
}

/**
 * WebP formatına çevir (512x512, < 100KB static / < 500KB animated)
 * WhatsApp standardı için STRICT size limits
 * Animated WebP'leri korur (canvas render etmez)
 */
export async function convertToWebP(blob: Blob, addWatermark: boolean = false): Promise<Blob> {
    // Check if already animated WebP - preserve it!
    const isAnimated = await isWebPAnimated(blob);

    if (isAnimated) {
        console.log('[convertToWebP] Animated WebP detected - preserving animation');
        const MAX_ANIMATED_SIZE = 500 * 1024; // 500KB for animated

        // If already WebP and under limit, return as-is
        if (blob.type === 'image/webp' && blob.size < MAX_ANIMATED_SIZE) {
            console.log(`[convertToWebP] Animated WebP size OK: ${blob.size} bytes`);
            return blob;
        }

        // If too large, we can't compress animated WebP in browser
        // Return as-is and let native plugin handle it
        console.warn(`[convertToWebP] Animated WebP too large (${blob.size} bytes), passing to native`);
        return blob;
    }

    // Static image - use canvas rendering
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const objectUrl = URL.createObjectURL(blob);

        img.onload = async () => {
            URL.revokeObjectURL(objectUrl);
            // WhatsApp için kesinlikle 512x512
            canvas.width = 512;
            canvas.height = 512;

            // Resmi ortala ve ölçeklendir
            const scale = Math.max(512 / img.width, 512 / img.height);
            const x = (512 - img.width * scale) / 2;
            const y = (512 - img.height * scale) / 2;

            ctx.clearRect(0, 0, 512, 512);
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

            if (addWatermark) {
                // Draw a subtle watermark at the bottom right
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "bold 20px Arial";
                ctx.textAlign = "right";
                // Add a small dark shadow to make it readable on light and dark stickers
                ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText("Kloze", 500, 500);

                // Reset shadow for further operations if needed
                ctx.shadowColor = "transparent";
            }

            // Strict 100KB Limit Loop (static only)
            let quality = 0.9;
            let resultBlob: Blob | null = null;
            const MAX_SIZE = 100 * 1024; // 100KB

            while (quality > 0.1) {
                resultBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/webp', quality));

                if (resultBlob && resultBlob.size < MAX_SIZE) {
                    resolve(resultBlob);
                    return;
                }

                // Reduce quality aggressively if file is big
                quality -= 0.1;
            }

            // If still too big (unlikely with 0.1), resolve anyway but warn
            if (resultBlob) resolve(resultBlob);
            else reject(new Error('WebP compression failed'));
        };

        img.onerror = (err) => {
            URL.revokeObjectURL(objectUrl);
            reject(err);
        };
        img.src = objectUrl;
    });
}

/**
 * Helper: Compress Image to <300KB WebP (Max 512px)
 * Used for Admin Uploads mainly
 * Preserves animated WebP
 */
export async function compressImage(file: File | Blob, startQuality: number = 0.85, maxDimension: number = 512): Promise<Blob> {
    // Check if animated WebP - preserve it!
    const isAnimated = await isWebPAnimated(file);

    if (isAnimated) {
        console.log('[compressImage] Animated WebP detected - skipping compression');
        const MAX_ANIMATED_SIZE = 500 * 1024; // 500KB for animated

        // If under limit, return as-is
        if (file.size < MAX_ANIMATED_SIZE) {
            console.log(`[compressImage] Animated WebP size OK: ${file.size} bytes`);
            return file instanceof Blob ? file : new Blob([file]);
        }

        // Too large - can't compress animated WebP in browser
        console.warn(`[compressImage] Animated WebP too large (${file.size} bytes), returning as-is`);
        return file instanceof Blob ? file : new Blob([file]);
    }

    // Static image - compress normally
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
