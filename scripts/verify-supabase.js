
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '../.env');

let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if ((!supabaseUrl || !supabaseKey) && fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    for (const line of envConfig.split('\n')) {
        const urlMatch = line.match(/^VITE_SUPABASE_URL=(.*)$/);
        const keyMatch = line.match(/^VITE_SUPABASE_ANON_KEY=(.*)$/);

        if (urlMatch) supabaseUrl = urlMatch[1].trim();
        if (keyMatch) supabaseKey = keyMatch[1].trim();
    }
}

// Cleanup quotes
if (supabaseUrl) supabaseUrl = supabaseUrl.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
if (supabaseKey) supabaseKey = supabaseKey.replace(/^"|"$/g, '').replace(/^'|'$/g, '');

if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Supabase credentials missing in .env or environment");
    // Just try to run anyway, maybe they are in process.env? If not it will fail below.
} else {
    console.log("Found Supabase credentials.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabase() {
    console.log("Verifying Supabase connection...");

    // 1. Check Table Access
    try {
        const { data, error } = await supabase.from('user_stickers').select('id').limit(1);
        if (error) {
            console.error("❌ Table user_stickers check failed:", error.message);
        } else {
            console.log("✅ Table 'user_stickers' is accessible.");
        }
    } catch (e) {
        console.error("Exception checking table:", e);
    }

    // 2. Check Storage Buckets
    console.log("Checking Storage buckets...");
    const requiredBuckets = ['stickers', 'thumbnails'];

    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error("❌ Failed to list buckets:", error.message);
            return;
        }

        const bucketNames = buckets.map(b => b.name);
        console.log("Available buckets:", bucketNames);

        requiredBuckets.forEach(req => {
            if (bucketNames.includes(req)) {
                console.log(`✅ Bucket '${req}' exists.`);
            } else {
                console.error(`❌ Bucket '${req}' is MISSING.`);
            }
        });

    } catch (e) {
        console.error("Exception checking buckets:", e);
    }
}

verifySupabase();
