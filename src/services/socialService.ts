import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
    creator_id: string;
    creator_name: string;
    creator_avatar: string;
    total_downloads: number;
    total_likes: number;
    score: number;
}

export interface Badge {
    id: string;
    name: string;
    icon: string;
    description: string;
    earnedAt?: string;
}

export const AVAILABLE_BADGES: Badge[] = [
    { id: 'first_pack', name: 'İlk Paket', icon: '📦', description: 'İlk paketini yayınladın!' },
    { id: '1k_downloads', name: 'Popüler', icon: '🔥', description: '1.000 İndirmeye ulaştın!' },
    { id: 'pro_creator', name: 'Pro Yaratıcı', icon: '👑', description: 'Pro üyeliğe geçtin!' },
    { id: 'social_star', name: 'Sosyal Yıldız', icon: '🌟', description: '100 Beğeniye ulaştın!' },
];

/**
 * Get Leaderboard (RPC)
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase.rpc('get_leaderboard', { days_ago: 7 });
    if (error) {
        console.error('Leaderboard fetch failed', error);
        return [];
    }
    return data;
}

/**
 * Check and Award Badges
 */
export async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
    // 1. Get User Stats
    const { data: packs } = await supabase.from('sticker_packs').select('downloads, likes_count').eq('user_id', userId);
    const { data: profile } = await supabase.from('profiles').select('is_pro').eq('id', userId).single();

    // Get existing badges
    const { data: existingBadgesData } = await supabase.from('user_badges').select('badge_id').eq('user_id', userId);
    const existingBadgeIds = new Set((existingBadgesData || []).map(b => b.badge_id));

    if (!packs || !profile) return [];

    const totalDownloads = packs.reduce((acc, p) => acc + (p.downloads || 0), 0);
    const totalLikes = packs.reduce((acc, p) => acc + (p.likes_count || 0), 0);
    const totalPacks = packs.length;

    const newBadges: Badge[] = [];

    // Helper to check and add
    const check = (condition: boolean, badgeId: string) => {
        if (condition && !existingBadgeIds.has(badgeId)) {
            const badge = AVAILABLE_BADGES.find(b => b.id === badgeId);
            if (badge) {
                newBadges.push({ ...badge, earnedAt: new Date().toISOString() });
            }
        }
    };

    // Rules
    check(totalPacks > 0, 'first_pack');
    check(totalDownloads >= 1000, '1k_downloads');
    check(profile.is_pro, 'pro_creator');
    check(totalLikes >= 100, 'social_star');

    // If new badges earned, insert to DB
    if (newBadges.length > 0) {
        const inserts = newBadges.map(b => ({
            user_id: userId,
            badge_id: b.id,
            earned_at: b.earnedAt
        }));

        await supabase.from('user_badges').insert(inserts);
        return newBadges;
    }

    return [];
}

/**
 * Get User Badges
 */
export async function getUserBadges(userId: string): Promise<Badge[]> {
    const { data } = await supabase.from('user_badges').select('*').eq('user_id', userId);
    if (!data) return [];

    return data.map(row => {
        const def = AVAILABLE_BADGES.find(b => b.id === row.badge_id);
        if (!def) return null;
        return { ...def, earnedAt: row.earned_at };
    }).filter(Boolean) as Badge[];
}

/**
 * Publish a Pack
 */
export async function publishPack(packId: string): Promise<boolean> {
    const { error } = await supabase
        .from('sticker_packs')
        .update({ is_public: true, published_at: new Date().toISOString() })
        .eq('id', packId);

    return !error;
}

/**
 * Collect a Pack (Bookmark)
 */
export async function toggleCollection(packId: string, userId: string): Promise<boolean> {
    // Check if exists
    const { data } = await supabase
        .from('user_pack_collections')
        .select('id')
        .eq('user_id', userId)
        .eq('pack_id', packId)
        .single();

    if (data) {
        // Remove
        await supabase.from('user_pack_collections').delete().eq('id', data.id);
        return false; // Removed
    } else {
        // Add
        await supabase.from('user_pack_collections').insert({ user_id: userId, pack_id: packId });
        return true; // Added
    }
}

/**
 * Check if Pack is Collected
 */
export async function isPackCollected(packId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
        .from('user_pack_collections')
        .select('id')
        .eq('user_id', userId)
        .eq('pack_id', packId)
        .single();
    return !!data;
}
