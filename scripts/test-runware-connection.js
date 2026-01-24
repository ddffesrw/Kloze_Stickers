import { Runware } from '@runware/sdk-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');

let apiKey = process.env.VITE_RUNWARE_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
        const match = line.match(/^VITE_RUNWARE_API_KEY=(.*)$/);
        if (match) {
            apiKey = match[1].trim();
            break;
        }
    }
}

if (!apiKey) {
    console.error("Error: VITE_RUNWARE_API_KEY is missing");
    process.exit(1);
}

apiKey = apiKey.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

console.log("Found API Key (starts with):", apiKey.substring(0, 8) + "...");

async function testConnection() {
    console.log("Initializing Runware SDK...");
    const runware = new Runware({ apiKey });

    const model = 'c3383a18-6364-42b4-825f-228770a31627'; // User Provided UUID (Flux Schnell)
    console.log(`\nTesting valid model: ${model} with explicit dimensions...`);

    try {
        const images = await runware.requestImages({
            positivePrompt: "a simple red box",
            model: model,
            numberResults: 1,
            outputType: "URL",
            width: 512,
            height: 512,
            steps: 4 // Flux Schnell needs few steps
        });
        console.log(`SUCCESS!`);
        console.log("Images:", JSON.stringify(images, null, 2));
    } catch (error) {
        console.error(`FAILED with model ${model}:`, error.message || error);
        console.error("Full error:", JSON.stringify(error, null, 2));
    }
}

testConnection();
