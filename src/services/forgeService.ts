/**
 * Forge Sticker Generation Service
 * Connects to LOCAL Stable Diffusion Forge/Automatic1111 API
 * 
 * Forge runs on: http://localhost:7860
 * API endpoint: /sdapi/v1/txt2img
 */

// Local Forge/A1111 API URL - can be configured
const LOCAL_SD_URL = import.meta.env.VITE_LOCAL_SD_URL || 'http://127.0.0.1:7860';

/**
 * Generate Sticker using LOCAL Stable Diffusion (Forge/A1111)
 * Requires Forge to be running with --api flag
 */
export async function generateStickerForge(options: { prompt: string }): Promise<{ imageURL: string, seed: number }> {
    try {
        console.log("[Local SD] Generating sticker with Forge...");

        // Use the prompt exactly as it comes from the app (contains style + keywords)
        // AdminPage adds: "prompt + style + sticker keywords"
        const stickerPrompt = options.prompt;

        // STICKER-OPTIMIZED NEGATIVE PROMPT (Balanced version)
        const negativePrompt = "blurry, low quality, text, watermark, signature, deformed, ugly, bad anatomy, extra limbs, missing limbs, realistic photograph, 3d render, complex background, multiple characters, duplicate, split image";

        const seed = Math.floor(Math.random() * 2147483647);

        const requestBody = {
            prompt: stickerPrompt,
            negative_prompt: negativePrompt,
            steps: 25,
            cfg_scale: 7,
            width: 512,
            height: 512,
            seed: seed,
            sampler_name: "Euler a",
            batch_size: 1,
            n_iter: 1,
        };

        console.log("[Local SD] Sending request to:", `${LOCAL_SD_URL}/sdapi/v1/txt2img`);

        const response = await fetch(`${LOCAL_SD_URL}/sdapi/v1/txt2img`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Local SD] Error:", response.status, errorText);
            throw new Error(`Forge API Error: ${response.status}. Forge çalışıyor mu?`);
        }

        const result = await response.json();

        if (!result.images || result.images.length === 0) {
            throw new Error("Forge görsel döndürmedi");
        }

        // Result contains base64 encoded image
        const base64Image = result.images[0];

        // Convert base64 to blob URL
        const binaryString = atob(base64Image);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/png' });
        const imageURL = URL.createObjectURL(blob);

        // Get actual seed from response
        const actualSeed = result.info ? JSON.parse(result.info).seed : seed;

        console.log("[Local SD] ✅ Success! Seed:", actualSeed);
        return { imageURL, seed: actualSeed };

    } catch (error: any) {
        console.error("[Local SD] Failed:", error);

        // Helpful error message
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            throw new Error("Forge'a bağlanılamadı. Forge çalıştığından ve --api modunda başlatıldığından emin olun.");
        }

        throw new Error(error.message || "Generation failed");
    }
}

/**
 * Check if Forge is running
 */
export async function checkForgeConnection(): Promise<boolean> {
    try {
        const response = await fetch(`${LOCAL_SD_URL}/sdapi/v1/sd-models`, {
            method: "GET",
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Get available models from Forge
 */
export async function getForgeModels(): Promise<string[]> {
    try {
        const response = await fetch(`${LOCAL_SD_URL}/sdapi/v1/sd-models`);
        if (response.ok) {
            const models = await response.json();
            return models.map((m: any) => m.title);
        }
    } catch { }
    return [];
}

/**
 * Get Current Model
 */
export async function getForgeCurrentModel(): Promise<string> {
    try {
        const response = await fetch(`${LOCAL_SD_URL}/sdapi/v1/options`);
        if (response.ok) {
            const options = await response.json();
            return options.sd_model_checkpoint || "";
        }
    } catch { }
    return "";
}

/**
 * Set Forge Model
 */
export async function setForgeModel(modelTitle: string): Promise<boolean> {
    try {
        console.log("[Local SD] Switching model to:", modelTitle);
        const response = await fetch(`${LOCAL_SD_URL}/sdapi/v1/options`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sd_model_checkpoint: modelTitle })
        });
        return response.ok;
    } catch (e) {
        console.error("Model switch failed", e);
        return false;
    }
}

/**
 * @deprecated Use backgroundRemovalService instead
 */
export async function removeBackgroundHF(imageBlob: Blob): Promise<Blob> {
    throw new Error("Use backgroundRemovalService instead");
}

// Backwards compatibility alias
export const generateStickerHF = generateStickerForge;
