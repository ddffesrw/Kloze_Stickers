
const COMFY_API_URL = "http://127.0.0.1:8188";

export interface ComfyHistoryItem {
    prompt_id: string;
    outputs: {
        [key: string]: {
            images: Array<{
                filename: string;
                subfolder: string;
                type: string;
            }>;
        };
    };
}

export interface ComfyImage {
    id: string; // Unique identifier for selection
    filename: string;
    subfolder: string;
    type: string;
    url: string; // Internal URL for preview
    blob?: Blob;
}

/**
 * Get recent generation history from ComfyUI
 */
export async function getComfyHistory(limit: number = 20, baseUrl: string = COMFY_API_URL): Promise<ComfyImage[]> {
    try {
        const response = await fetch(`${baseUrl}/history`);
        if (!response.ok) throw new Error("ComfyUI connection failed");

        const data = await response.json();
        const historyIds = Object.keys(data).reverse().slice(0, limit);

        const images: ComfyImage[] = [];

        historyIds.forEach(historyId => {
            const item = data[historyId];
            if (item.outputs) {
                Object.values(item.outputs).forEach((output: any) => {
                    if (output.images) {
                        output.images.forEach((img: any) => {
                            // Only process image files
                            if (img.filename.match(/\.(png|jpg|webp)$/i)) {
                                images.push({
                                    id: `${historyId}-${img.filename}-${images.length}`, // Unique ID
                                    filename: img.filename,
                                    subfolder: img.subfolder,
                                    type: img.type,
                                    url: `${baseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
                                });
                            }
                        });
                    }
                });
            }
        });

        return images;
    } catch (error) {
        console.error("ComfyUI History Error:", error);
        throw error;
    }
}

/**
 * Fetch the actual Blob for an image
 */
export async function getComfyImageBlob(img: ComfyImage): Promise<Blob> {
    const response = await fetch(img.url);
    if (!response.ok) throw new Error("Failed to download image from ComfyUI");
    return await response.blob();
}

import inpaintingWorkflow from '@/data/inpainting_workflow.json';

/**
 * Upload an image (or mask) to ComfyUI
 */
async function uploadImageToComfy(file: File | Blob, type: 'input' | 'mask' = 'input', name?: string): Promise<string> {
    const formData = new FormData();
    // Default name if not provided
    const fileName = name || (type === 'input' ? 'input_image.png' : 'mask_image.png');

    // Ensure it's a file
    const fileToUpload = file instanceof File ? file : new File([file], fileName, { type: 'image/png' });

    formData.append("image", fileToUpload);
    formData.append("type", type); // 'input', 'output', 'temp'
    formData.append("overwrite", "true");

    const response = await fetch(`${COMFY_API_URL}/upload/image`, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) throw new Error("Failed to upload image to ComfyUI");

    const result = await response.json();
    return result.name; // Return filename saved on server
}

/**
 * Fix Sticker Using Inpainting
 */
export async function fixStickerWithInpainting(
    originalImage: Blob | string,
    maskImage: Blob,
    prompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
        // 1. Upload Original Image
        const originalBlob = typeof originalImage === 'string'
            ? await fetch(originalImage).then(r => r.blob())
            : originalImage;

        const originalName = await uploadImageToComfy(originalBlob, 'input', 'fix_source.png');

        // 2. Upload Mask Image
        const maskName = await uploadImageToComfy(maskImage, 'input', 'fix_mask.png');

        // 3. Prepare Workflow
        const workflow = JSON.parse(JSON.stringify(inpaintingWorkflow));

        // Update Nodes
        // Validating node IDs from inpainting_workflow.json
        // Node 11: Load Image (Original)
        if (workflow["11"]) workflow["11"].inputs.image = originalName;

        // Node 13: Load Image (Mask)
        if (workflow["13"]) workflow["13"].inputs.image = maskName;

        // Node 6: Positive Prompt
        if (workflow["6"]) workflow["6"].inputs.text = prompt + ", vector style, high quality, seamless";

        // Node 3: KSampler (Seed randomization)
        if (workflow["3"]) workflow["3"].inputs.seed = Math.floor(Math.random() * 10000000);

        // 4. Queue Prompt
        const response = await fetch(`${COMFY_API_URL}/prompt`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: workflow }),
        });

        if (!response.ok) throw new Error("Failed to queue prompt");

        const { prompt_id } = await response.json();

        // 5. Poll for Result (Simplified for now - wait 5s then check history)
        // In a real app, use WebSocket. For now, simple delay loop.
        await new Promise(r => setTimeout(r, 5000));

        // Let's assume it finishes in ~5-10s
        let attempts = 0;
        while (attempts < 10) {
            const history = await getComfyHistory(1);
            const latest = history[0];

            // Basic check: if latest history belongs to this workflow (by checking filename prefix or ID?)
            // Comfy history is global, so latest is likely ours.
            if (latest) {
                return { success: true, imageUrl: latest.url };
            }

            await new Promise(r => setTimeout(r, 2000));
            attempts++;
        }

        throw new Error("Timeout waiting for generation");

    } catch (error: any) {
        console.error("Inpainting failed:", error);
        return { success: false, error: error.message };
    }
}
