import { GeneratedSticker, GenerateStickerOptions } from './runwareService';

/**
 * Hugging Face API Service
 * black-forest-labs/FLUX.1-schnell modelini kullanır.
 */

const HF_API_URL = "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell";

export async function generateStickerHF(
    options: GenerateStickerOptions
): Promise<GeneratedSticker> {
    const apiKey = import.meta.env.VITE_HUGGING_FACE_TOKEN;
    if (!apiKey) throw new Error('VITE_HUGGING_FACE_TOKEN bulunamadı');

    // Sticker prompt optimizasyonu (Runware ile aynı mantık)
    const optimizedPrompt = `${options.prompt}, die-cut sticker, professional vector illustration, thick white border, solid flat white background, isolated on white background, high quality, 8k, clean edges, sticker style, vibrant colors, simple composition`;

    console.log('[HF] Generating with prompt:', optimizedPrompt);

    try {
        const response = await fetch(HF_API_URL, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
                inputs: optimizedPrompt,
                parameters: {
                    width: options.width || 512,
                    height: options.height || 512,
                    // Flux specific (bazı parametreler HF inference API'de farklı olabilir ama genelde interference API bunları yoksayar veya uygun olanı alır)
                }
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[HF] Error Response:', errorText);
            throw new Error(`HF API Hatası: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageURL = URL.createObjectURL(blob);
        const seed = Math.floor(Math.random() * 1000000); // HF seed dönmezse rastgele

        console.log('[HF] Success, Blob created:', imageURL);

        return {
            imageURL,
            seed,
            width: options.width || 512,
            height: options.height || 512
        };

    } catch (error) {
        console.error('[HF] Error:', error);
        throw new Error('Ücretsiz üretim sırasında hata oluştu. Lütfen tekrar deneyin.');
    }
}
