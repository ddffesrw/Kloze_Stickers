/**
 * Moderation Service
 * Proactively checks prompts for NSFW or inappropriate content
 */

const BANNED_KEYWORDS = [
    // NSFW / Sexual
    'nsfw', 'naked', 'nude', 'sex', 'porn', 'xxx', 'hentai', 'sexual', 'genitals',
    'vagina', 'penis', 'breast', 'nipple', 'ass', 'butt', 'erotic', 'lingerie',
    'çıplak', 'seks', 'porno', 'meme', 'göğüs', 'kalça', 'vajina', 'penis', 'cinsel',

    // Violence / Hate
    'kill', 'blood', 'gore', 'dead', 'death', 'murder', 'suicide', 'war', 'nazi',
    'racist', 'hate', 'terrorist', 'bomb', 'gun', 'weapon',
    'öldür', 'kan', 'vahşet', 'ölü', 'ölüm', 'cinayet', 'intihar', 'savaş', 'ırkçı',
    'nefret', 'terör', 'bomba', 'silah',

    // Illegal / Drugs
    'cocaine', 'heroin', 'meth', 'drugs', 'weed', 'marijuana',
    'kokain', 'eroin', 'uyuşturucu', 'esrar'
];

export interface ModerationResult {
    isSafe: boolean;
    flaggedKeywords: string[];
}

/**
 * Check if a prompt contains any banned keywords
 * @param prompt The user input prompt
 * @returns ModerationResult
 */
export function checkPromptSafety(prompt: string): ModerationResult {
    if (!prompt) return { isSafe: true, flaggedKeywords: [] };

    const normalizedPrompt = prompt.toLowerCase();
    const flaggedKeywords = BANNED_KEYWORDS.filter(keyword =>
        normalizedPrompt.includes(keyword.toLowerCase())
    );

    return {
        isSafe: flaggedKeywords.length === 0,
        flaggedKeywords
    };
}

/**
 * Get a user-friendly warning message
 */
export function getSafetyWarningMessage(result: ModerationResult): string {
    if (result.isSafe) return '';

    return `Üzgünüz, yazdığınız içerik güvenlik politikalarımıza aykırı olabilir (Tespit edilen: ${result.flaggedKeywords.join(', ')}). Lütfen daha uygun bir açıklama kullanın.`;
}

/**
 * Common Negative Prompts to improve safety on Stable Diffusion
 */
export const GLOBAL_NEGATIVE_PROMPT = "nsfw, nude, naked, sexual, genitals, breast, nipple, blood, gore, violence, text, watermark, blurry";
