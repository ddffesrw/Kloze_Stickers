import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { StickerPack, Sticker } from './stickerService';
import { Capacitor } from '@capacitor/core';
import { WhatsAppStickers } from '@/plugins/whatsapp-stickers';

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
 * Helper: Convert Blob to Base64 (without prefix)
 */
async function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // remove data:image/webp;base64, prefix
            resolve(base64.split(',')[1]);
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

            // 2. Tray Icon
            const trayBlob = await fetchImageBlob(pack.tray_image_url || stickers[0].image_url);
            const trayBase64 = await blobToBase64(trayBlob);

            // 3. Stickers
            const stickersData = [];
            for (const sticker of stickers) {
                const blob = await fetchImageBlob(sticker.image_url);
                const base64 = await blobToBase64(blob);
                stickersData.push({
                    data: base64,
                    emojis: ["😀", "✨"]
                });
            }

            // 4. Call Native Plugin
            await WhatsAppStickers.addStickerPack({
                identifier: pack.id,
                name: pack.title,
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

    // 1. Tray Icon
    const trayBlob = await fetchImageBlob(pack.tray_image_url || stickers[0].image_url);
    zip.file("tray.png", trayBlob);

    // 2. Stickers
    const stickerMetadata: WhatsAppStickerContent[] = [];

    for (let i = 0; i < stickers.length; i++) {
        const sticker = stickers[i];
        const fileName = `${i + 1}.webp`;

        const blob = await fetchImageBlob(sticker.image_url);
        zip.file(fileName, blob);

        stickerMetadata.push({
            image_file: fileName,
            emojis: ["😀", "✨"] // Varsayılan emojiler
        });
    }

    // 3. Metadata JSON
    const metadata: WhatsAppPackMetadata = {
        identifier: pack.id,
        name: pack.title,
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
    const safeTitle = pack.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
    const safeTitle = pack.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(content, `${safeTitle}_images.zip`);
}
