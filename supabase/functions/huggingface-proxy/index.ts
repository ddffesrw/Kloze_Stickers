// Supabase Edge Function: Image Generation Proxy
// Uses Segmind Stable Diffusion API (free 100 images/month)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Segmind API - Free tier: 100 images/month
const SEGMIND_API_URL = "https://api.segmind.com/v1/sdxl1.0-txt2img";

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const SEGMIND_API_KEY = Deno.env.get("SEGMIND_API_KEY");

        const { prompt, width = 1024, height = 1024 } = await req.json();

        if (!prompt) {
            return new Response(
                JSON.stringify({ error: "Prompt is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // High quality sticker prompt
        const stickerPrompt = `${prompt}, sticker design, cute kawaii style, white background, clean vector art, thick black outline, vibrant colors, isolated subject, no shadows, die-cut sticker, masterpiece, best quality`;

        const negativePrompt = "blurry, low quality, text, watermark, signature, deformed, ugly, bad anatomy, realistic, photograph, 3d render";

        console.log(`[Segmind] Generating: ${prompt.substring(0, 50)}...`);

        // Check if we have Segmind API key
        if (SEGMIND_API_KEY) {
            try {
                const segmindResponse = await fetch(SEGMIND_API_URL, {
                    method: "POST",
                    headers: {
                        "x-api-key": SEGMIND_API_KEY,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        prompt: stickerPrompt,
                        negative_prompt: negativePrompt,
                        samples: 1,
                        scheduler: "UniPC",
                        num_inference_steps: 25,
                        guidance_scale: 7.5,
                        seed: Math.floor(Math.random() * 1000000),
                        img_width: width,
                        img_height: height,
                        base64: false,
                    }),
                });

                if (segmindResponse.ok) {
                    const imageBlob = await segmindResponse.blob();
                    if (imageBlob.type.startsWith("image/")) {
                        console.log(`[Segmind] ✅ Success (${imageBlob.size} bytes)`);
                        return new Response(imageBlob, {
                            headers: { ...corsHeaders, "Content-Type": imageBlob.type },
                        });
                    }
                }
                console.warn("[Segmind] Failed, trying fallback...");
            } catch (e) {
                console.warn("[Segmind] Error:", e);
            }
        }

        // Fallback: Use a reliable HuggingFace Space via Gradio API
        const HF_TOKEN = Deno.env.get("HF_ACCESS_TOKEN") || "";

        console.log("[Fallback] Trying HuggingFace Spaces...");

        // Use stabilityai/stable-diffusion-2-1 Gradio Space
        const gradioResponse = await fetch(
            "https://stabilityai-stable-diffusion.hf.space/api/predict",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(HF_TOKEN ? { "Authorization": `Bearer ${HF_TOKEN}` } : {}),
                },
                body: JSON.stringify({
                    data: [stickerPrompt, negativePrompt, 7.5, 512, 512, 25]
                }),
            }
        );

        if (gradioResponse.ok) {
            const result = await gradioResponse.json();
            if (result.data && result.data[0]) {
                // Gradio returns base64 image
                let base64Data = result.data[0];
                if (base64Data.startsWith("data:")) {
                    base64Data = base64Data.split(",")[1];
                }

                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }

                console.log("[Fallback] ✅ HF Space success");
                return new Response(bytes, {
                    headers: { ...corsHeaders, "Content-Type": "image/png" },
                });
            }
        }

        // Ultimate fallback: Simple placeholder with error message
        return new Response(
            JSON.stringify({ error: "Tüm görsel üretim servisleri şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin." }),
            { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("[Proxy] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Unknown error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
