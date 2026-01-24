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

apiKey = apiKey ? apiKey.replace(/^"|"$/g, '').replace(/^'|'$/g, '') : '';

async function search() {
    console.log("Initializing Runware SDK...");
    const runware = new Runware({ apiKey });

    console.log("Searching for 'flux' models...");
    try {
        const results = await runware.modelSearch({
            search: "flux",
            limit: 10
        });

        console.log("Results:");
        results.forEach(m => {
            console.log(`- Name: ${m.name}`);
            console.log(`  AIR: ${m.air}`); // This is likely the ID we need
            console.log(`  Version: ${m.version}`);
            console.log(`  Type: ${m.type}`);
            console.log("-------------------");
        });
    } catch (e) {
        console.error("Search failed:", e);
    }
}

search();
