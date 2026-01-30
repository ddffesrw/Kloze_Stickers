/**
 * Report Service
 * Handle content moderation and reporting
 */

import { supabase } from '@/lib/supabase';

export interface Report {
    id: string;
    reporter_id: string;
    reported_pack_id?: string;
    reported_user_id?: string;
    reason: 'inappropriate' | 'spam' | 'copyright' | 'hate_speech' | 'other';
    description?: string;
    status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
    reviewed_by?: string;
    reviewed_at?: string;
    created_at: string;
    // Joined data
    reporter?: { email: string };
    reported_pack?: { name: string; tray_image_url: string };
    reported_user?: { email: string };
}

/**
 * Report a sticker pack
 */
export async function reportPack(
    packId: string,
    reason: Report['reason'],
    description?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: user.id,
                reported_pack_id: packId,
                reason,
                description,
                status: 'pending'
            });

        if (error) throw error;

        return {
            success: true,
            message: 'Şikayetiniz alındı. 24 saat içinde incelenecek.'
        };
    } catch (error: any) {
        console.error('Report pack failed:', error);
        return {
            success: false,
            message: error.message || 'Şikayet gönderilemedi'
        };
    }
}

/**
 * Report a user
 */
export async function reportUser(
    userId: string,
    reason: Report['reason'],
    description?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('reports')
            .insert({
                reporter_id: user.id,
                reported_user_id: userId,
                reason,
                description,
                status: 'pending'
            });

        if (error) throw error;

        return {
            success: true,
            message: 'Kullanıcı rapor edildi.'
        };
    } catch (error: any) {
        console.error('Report user failed:', error);
        return {
            success: false,
            message: error.message || 'Kullanıcı rapor edilemedi'
        };
    }
}

/**
 * Get my submitted reports
 */
export async function getMyReports(): Promise<Report[]> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('reports')
            .select(`
        *,
        reported_pack:sticker_packs(name, tray_image_url),
        reported_user:profiles!reports_reported_user_id_fkey(email)
      `)
            .eq('reporter_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Get my reports failed:', error);
        return [];
    }
}

/**
 * Get all reports (Admin only)
 */
/**
 * Get all reports (Admin)
 * Manually joins data to bypass potential missing FK issues
 */
export async function getAllReports(): Promise<Report[]> {
    try {
        // 1. Fetch raw reports
        const { data: reports, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!reports || reports.length === 0) return [];

        // 2. Fetch Users (Reporter & Reported User)
        // We use admin RPC to get email mapping, or fallback to empty object if fails
        let userMap: Record<string, { email: string }> = {};
        try {
            const { data: users } = await supabase.rpc('admin_get_all_users');
            if (users) {
                users.forEach((u: any) => {
                    userMap[u.id] = { email: u.email || 'No Email' };
                });
            }
        } catch (e) {
            console.warn("Could not fetch users for report mapping", e);
        }

        // 3. Fetch Packs (Reported Pack)
        let packMap: Record<string, { name: string, tray_image_url: string }> = {};
        try {
            const packIds = reports
                .map(r => r.reported_pack_id)
                .filter(id => id); // non-null

            if (packIds.length > 0) {
                const { data: packs } = await supabase
                    .from('sticker_packs')
                    .select('id, name, tray_image_url')
                    .in('id', packIds);

                if (packs) {
                    packs.forEach(p => {
                        packMap[p.id] = { name: p.name, tray_image_url: p.tray_image_url };
                    });
                }
            }
        } catch (e) {
            console.warn("Could not fetch packs for report mapping", e);
        }

        // 4. Map the data
        const mappedReports: Report[] = reports.map(r => ({
            ...r,
            reporter: r.reporter_id ? userMap[r.reporter_id] : undefined,
            reported_user: r.reported_user_id ? userMap[r.reported_user_id] : undefined,
            reported_pack: r.reported_pack_id ? packMap[r.reported_pack_id] : undefined
        }));

        return mappedReports;

    } catch (error) {
        console.error('Get all reports failed:', error);
        return [];
    }
}

/**
 * Update report status (Admin only)
 */
export async function updateReportStatus(
    reportId: string,
    status: Report['status']
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('reports')
            .update({
                status,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', reportId);

        if (error) throw error;

        return {
            success: true,
            message: 'Rapor durumu güncellendi'
        };
    } catch (error: any) {
        console.error('Update report status failed:', error);
        return {
            success: false,
            message: error.message || 'Durum güncellenemedi'
        };
    }
}
