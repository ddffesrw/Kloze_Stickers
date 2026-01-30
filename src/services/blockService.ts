/**
 * Block Service
 * Handle user blocking/unblocking for user safety
 */

import { supabase } from '@/lib/supabase';

export interface Block {
    id: string;
    blocker_id: string;
    blocked_id: string;
    created_at: string;
}

/**
 * Block a user
 */
export async function blockUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        if (user.id === userId) {
            return { success: false, message: 'Kendinizi engelleyemezsiniz' };
        }

        const { error } = await supabase
            .from('blocks')
            .insert({
                blocker_id: user.id,
                blocked_id: userId
            });

        if (error) {
            // Check if already blocked (unique constraint violation)
            if (error.code === '23505') {
                return { success: false, message: 'Bu kullanıcı zaten engelli' };
            }
            throw error;
        }

        return {
            success: true,
            message: 'Kullanıcı engellendi. Artık içeriğini görmeyeceksiniz.'
        };
    } catch (error: any) {
        console.error('Block user failed:', error);
        return {
            success: false,
            message: error.message || 'Engelleme başarısız'
        };
    }
}

/**
 * Unblock a user
 */
export async function unblockUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('blocks')
            .delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', userId);

        if (error) throw error;

        return {
            success: true,
            message: 'Kullanıcı engeli kaldırıldı'
        };
    } catch (error: any) {
        console.error('Unblock user failed:', error);
        return {
            success: false,
            message: error.message || 'Engel kaldırma başarısız'
        };
    }
}

/**
 * Get list of blocked users
 */
export async function getBlockedUsers(): Promise<string[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('blocks')
            .select('blocked_id')
            .eq('blocker_id', user.id);

        if (error) throw error;
        return (data || []).map(b => b.blocked_id);
    } catch (error) {
        console.error('Get blocked users failed:', error);
        return [];
    }
}

/**
 * Check if a specific user is blocked
 */
export async function isUserBlocked(userId: string): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('blocks')
            .select('id')
            .eq('blocker_id', user.id)
            .eq('blocked_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
        return !!data;
    } catch (error) {
        console.error('Is user blocked check failed:', error);
        return false;
    }
}

/**
 * Get blocked user IDs as a Set for efficient filtering
 */
export async function getBlockedUserIdsSet(): Promise<Set<string>> {
    const blockedIds = await getBlockedUsers();
    return new Set(blockedIds);
}
