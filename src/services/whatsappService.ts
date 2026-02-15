import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { StickerPack } from './stickerPackService';
import { Sticker } from './stickerService';
import { Capacitor } from '@capacitor/core';
import { WhatsAppStickers } from '@/plugins/whatsapp-stickers';
import { convertToWebP, createTrayIcon } from '@/utils/imageUtils';

interface WhatsAppStickerContent {
    image_file: string;
    emojis: string[];
}

interface WhatsAppPackMetadata {
    identifier: string;
    name: string;
    publisher: string;
    tray_image_file: string;
    image_data_version: string;
    avoid_cache: boolean;
    publisher_email: string;
    publisher_website: string;
    privacy_policy_website: string;
    license_agreement_website: string;
    stickers: WhatsAppStickerContent[];
}

/**
 * Helper: Download image as Blob
 */
async function fetchImageBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
    return response.blob();
}

/**
 * Helper: Convert Blob to Base64 data URL (with prefix)
 * Kotlin plugin expects data: prefix to decode correctly
 */
async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // Return full data URL (data:image/webp;base64,...)
            // Kotlin plugin checks for "data:" prefix to decode
            resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Create a WhatsApp Sticker Pack (.wasticker file which is a ZIP) or Open Native Intent
 */
export async function downloadWhatsAppPack(pack: StickerPack, stickers: Sticker[]) {
    if (stickers.length < 3) {
        throw new Error("WhatsApp paketi için en az 3 sticker gereklidir.");
    }
    if (stickers.length > 30) {
        throw new Error("WhatsApp paketi en fazla 30 sticker içerebilir.");
    }

    // --- NATIVE MOBILE FLOW ---
    if (Capacitor.isNativePlatform()) {
        try {
            // 1. WhatsApp yüklü mü?
            const { installed } = await WhatsAppStickers.isWhatsAppInstalled();
            if (!installed) {
                throw new Error("WhatsApp cihazda yüklü değil.");
            }

            // 2. Tray Icon Process (96x96, <50KB)
            const trayUrl = pack.tray_image_url || stickers[0].image_url;
            const trayBlob = await createTrayIcon(trayUrl); // Strict processing
            const trayBase64 = await blobToBase64(trayBlob);

            // 3. Stickers Process (512x512, <100KB)
            const stickersData = [];
            for (const sticker of stickers) {
                // Fetch Original
                const rawBlob = await fetchImageBlob(sticker.image_url);

                // Process on-the-fly (Resize & Compress)
                const compliantBlob = await convertToWebP(rawBlob);

                // Convert to Base64
                const base64 = await blobToBase64(compliantBlob);

                stickersData.push({
                    data: base64,
                    emojis: ["😀", "✨"]
                });
            }

            // 4. Call Native Plugin
            await WhatsAppStickers.addStickerPack({
                identifier: pack.id,
                name: pack.name,
                publisher: pack.publisher || "Kloze User",
                trayImage: trayBase64,
                stickers: stickersData,
                publisherWebsite: "https://kloze.app",
                privacyPolicyWebsite: "https://kloze.app/privacy",
                licenseAgreementWebsite: "https://kloze.app/license"
            });

            return; // Success (Plugin will open WhatsApp)

        } catch (e) {
            console.error("Native WhatsApp share failed:", e);
            throw e; // Let UI handle error
        }
    }

    // --- WEB FLOW (ZIP DOWNLOAD) ---
    const zip = new JSZip();

    // 1. Tray Icon Process (96x96, <50KB)
    const trayUrl = pack.tray_image_url || stickers[0].image_url;
    const trayBlob = await createTrayIcon(trayUrl);
    zip.file("tray.png", trayBlob);

    // 2. Stickers Process (512x512, <100KB)
    const stickerMetadata: WhatsAppStickerContent[] = [];

    for (let i = 0; i < stickers.length; i++) {
        const sticker = stickers[i];
        const fileName = `${i + 1}.webp`;

        const rawBlob = await fetchImageBlob(sticker.image_url);
        const compliantBlob = await convertToWebP(rawBlob);

        zip.file(fileName, compliantBlob);

        stickerMetadata.push({
            image_file: fileName,
            emojis: ["😀", "✨"] // Varsayılan emojiler
        });
    }

    // 3. Metadata JSON
    const metadata: WhatsAppPackMetadata = {
        identifier: pack.id,
        name: pack.name,
        publisher: pack.publisher || "Kloze User",
        tray_image_file: "tray.png",
        image_data_version: "1",
        avoid_cache: false,
        publisher_email: "",
        publisher_website: "",
        privacy_policy_website: "",
        license_agreement_website: "",
        stickers: stickerMetadata
    };

    zip.file("content.json", JSON.stringify(metadata, null, 2));

    // 4. Generate & Download
    const content = await zip.generateAsync({ type: "blob" });
    const safeTitle = pack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(content, `${safeTitle}.wasticker`);
}

/**
 * Download all stickers to Gallery individually (ZIP)
 */
export async function downloadAllStickers(pack: StickerPack, stickers: Sticker[]) {
    const zip = new JSZip();

    for (let i = 0; i < stickers.length; i++) {
        const sticker = stickers[i];
        const blob = await fetchImageBlob(sticker.image_url);
        zip.file(`sticker_${i + 1}.webp`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const safeTitle = pack.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(content, `${safeTitle}_images.zip`);
}
