
import { HfInference } from "@huggingface/inference";
import { removeBackground } from "@imgly/background-removal";
import { supabase } from "@/lib/supabase";

// Initialize client
const hf = new HfInference(import.meta.env.VITE_HUGGING_FACE_TOKEN);

/**
 * Generate Sticker using FLUX.1-Schnell (Fast & Good Quality)
 */
export async function generateStickerHF(prompt: string, userId: string): Promise<{ success: boolean, imageUrl?: string, error?: string }> {
    try {
        console.log("Generating with Hugging Face...", prompt);

        // Prompt Engineering: Sticker Template
        const enhancedPrompt = `die-cut sticker of ${prompt}, vector art, white border, flat design, white background, high quality illustration`;
        const negativePrompt = "shadow, realistic, photo, 3d, complex background";

        console.log("Enhanced Prompt:", enhancedPrompt);

        // 1. Call HF API
        const blob = await hf.textToImage({
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: enhancedPrompt,
            parameters: {
                // @ts-ignore
                num_inference_steps: 4,
                guidance_scale: 0.0,
                negative_prompt: negativePrompt
            }
        });

        // 2. Remove Background
        console.log("Removing background...");
        // Convert Blob to URL for mgly
        const tempUrl = URL.createObjectURL(blob);
        const processedBlob = await removeBackground(tempUrl);

        // 3. Upload to Supabase
        const fileName = `${userId}/${Date.now()}_hf.webp`;
        const { error: uploadError } = await supabase.storage
            .from('stickers')
            .upload(fileName, processedBlob, { contentType: 'image/webp' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('stickers')
            .getPublicUrl(fileName);

        // 4. Create DB Record (Auto-add to "Drafts")
        const { error: dbError } = await supabase
            .from('user_stickers')
            .insert({
                user_id: userId,
                image_url: publicUrl,
                prompt: prompt + " (HF)",
                pack_id: null // Draft
            });

        if (dbError) throw dbError;

        return { success: true, imageUrl: publicUrl };

    } catch (error: any) {
        console.error("HF Generation Failed:", error);
        return { success: false, error: error.message || "Generation failed" };
    }
}
