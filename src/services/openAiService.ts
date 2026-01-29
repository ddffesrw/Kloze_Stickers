import OpenAI from 'openai';

// Validate environment at module load
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
if (!OPENAI_API_KEY && import.meta.env.PROD) {
    console.warn('[OpenAI] VITE_OPENAI_API_KEY is not configured. DALL-E generation will not work.');
}

// Initialize client (lazy initialization - will fail gracefully if no key)
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key yapılandırılmamış. Lütfen VITE_OPENAI_API_KEY ayarlayın.');
    }
    if (!openai) {
        openai = new OpenAI({
            apiKey: OPENAI_API_KEY,
            dangerouslyAllowBrowser: true
        });
    }
    return openai;
}

export async function generateStickerDalle(prompt: string): Promise<{ imageURL: string, seed: number }> {
    const client = getOpenAIClient();

    try {
        console.log("[DALL-E] Generating with prompt:", prompt);

        const enhancedPrompt = `A high quality sticker of ${prompt}, die-cut, white border, vector art style, flat design, minimal shading, white background`;

        const response = await client.images.generate({
            model: "dall-e-3",
            prompt: enhancedPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "b64_json" // Prefer base64 to avoid CORS issues with blob URLs sometimes? Or URL is fine.
            // DALL-E URL expires in an hour, we must download effectively.
        });

        const data = response.data[0];
        if (!data.b64_json) throw new Error("No image data returned from DALL-E");

        // Convert Base64 to Blob URL
        const byteCharacters = atob(data.b64_json);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        const imageURL = URL.createObjectURL(blob);

        // DALL-E doesn't expose seed via API easily in response compared to others, generating a fake one for tracking
        const seed = Math.floor(Math.random() * 1000000);

        return { imageURL, seed };

    } catch (error: any) {
        console.error("DALL-E Generation Failed:", error);
        throw new Error(error.message || "DALL-E generation failed");
    }
}
