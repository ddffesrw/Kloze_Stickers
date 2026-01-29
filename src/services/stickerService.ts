/**
 * Sticker Service
 * Individual Sticker Management (CRUD, Stats, Uploads)
 */

import { supabase, type Database } from '@/lib/supabase';
import { storageService, BUCKETS } from './storageService';
import { compressImage } from '@/utils/imageUtils';

export type Sticker = Database['public']['Tables']['user_stickers']['Row'];

/**
 * Fetch drafts (stickers not in any pack) for the current user
 */
export async function getDraftStickers(userId: string): Promise<Sticker[]> {
    const { data, error } = await supabase
        .from('user_stickers')
        .select('*')
        .eq('user_id', userId)
        .is('pack_id', null)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Sticker[] || [];
}

/**
 * Fetch ALL stickers for the user (Both drafts and packed)
 */
export async function getAllUserStickers(userId: string): Promise<Sticker[]> {
    const { data, error } = await supabase
        .from('user_stickers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Sticker[] || [];
}

/**
 * Delete a sticker (DB + Storage)
 */
export async function deleteSticker(stickerId: string): Promise<void> {
    // 1. Get sticker info to delete file
    const { data: sticker } = await supabase
        .from('user_stickers')
        .select('image_url, thumbnail_url')
        .eq('id', stickerId)
        .single();

    if (sticker) {
        // Delete files
        const imagePath = storageService.getPathFromUrl(sticker.image_url);
        const thumbPath = storageService.getPathFromUrl(sticker.thumbnail_url);

        const pathsToDelete = [imagePath, thumbPath].filter(Boolean) as string[];

        if (pathsToDelete.length > 0) {
            if (imagePath) await storageService.delete(BUCKETS.STICKERS, [imagePath]).catch(e => console.warn("Sticker delete failed", e));
            if (thumbPath) await storageService.delete(BUCKETS.THUMBNAILS, [thumbPath]).catch(e => console.warn("Thumb delete failed", e));
        }
    }

    // 2. Delete DB record
    const { error } = await supabase
        .from('user_stickers')
        .delete()
        .eq('id', stickerId);

    if (error) throw error;
}

/**
 * Bulk Delete Stickers
 */
export async function bulkDeleteStickers(stickerIds: string[]): Promise<void> {
    // 1. Fetch file paths
    const { data: stickers } = await supabase
        .from('user_stickers')
        .select('image_url, thumbnail_url')
        .in('id', stickerIds);

    if (stickers) {
        const imagePaths = stickers.map(s => storageService.getPathFromUrl(s.image_url)).filter(Boolean) as string[];
        const thumbPaths = stickers.map(s => storageService.getPathFromUrl(s.thumbnail_url)).filter(Boolean) as string[];

        if (imagePaths.length > 0) await storageService.delete(BUCKETS.STICKERS, imagePaths).catch(e => console.warn("Bulk img delete fail", e));
        if (thumbPaths.length > 0) await storageService.delete(BUCKETS.THUMBNAILS, thumbPaths).catch(e => console.warn("Bulk thumb delete fail", e));
    }

    // 2. Delete DB records
    const { error } = await supabase
        .from('user_stickers')
        .delete()
        .in('id', stickerIds);

    if (error) throw error;
}

/**
 * Reorder Stickers in a Pack
 * (This updates stickers' sort_order, so it fits in StickerService, 
 * though it relates to packs, it modifies stickers table directly)
 */
export async function updateStickerOrder(orderedStickerIds: string[]): Promise<void> {
    const updates = orderedStickerIds.map((id, index) =>
        supabase
            .from('user_stickers')
            .update({ sort_order: index })
            .eq('id', id)
    );

    await Promise.all(updates);
}

/**
 * Get Total Size of Stickers in bytes
 */
export function calculateTotalSize(stickers: any[]): number {
    return stickers.reduce((acc, s) => acc + (s.size_bytes || 0), 0);
}

/**
 * Add Stickers to Pack (Simple update)
 */
export async function addStickersToPack(packId: string, stickerIds: string[]): Promise<void> {
    await supabase.from('user_stickers').update({ pack_id: packId }).in('id', stickerIds);
}

/**
 * Get User Stats (Downloads, Likes, Generated)
 */
export async function getUserStats(userId: string) {
    // 1. Get Generated Count
    const { count: generatedCount, error: genError } = await supabase
        .from('user_stickers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (genError) console.error("Stats error (gen):", genError);

    // 2. Get Pack Count
    const { count: packCount, error: packError } = await supabase
        .from('sticker_packs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (packError) console.error("Stats error (pack):", packError);

    return {
        generated: generatedCount || 0,
        downloads: 0,
        likesReceived: 0,
        favoritesCount: 0
    };
}

/**
 * Get Admin Stats (Global)
 */
export async function getAdminStats() {
    // 1. Total Packs
    const { count: totalPacks } = await supabase
        .from('sticker_packs')
        .select('*', { count: 'exact', head: true });

    // 2. Total Users
    const { count: totalUsers } = await supabase
        .from('profiles') // or users
        .select('*', { count: 'exact', head: true });

    // 3. User Sticker Count (Total Generated)
    const { count: totalStickers } = await supabase
        .from('user_stickers')
        .select('*', { count: 'exact', head: true });

    return {
        totalPacks: totalPacks || 0,
        totalUsers: totalUsers || 0,
        totalStickers: totalStickers || 0,
        revenue: (totalUsers || 0) * 0, // Placeholder
    };
}

/**
 * Upload a single sticker file for Admin
 */
export async function uploadAdminSticker(file: File, userId: string, packId?: string): Promise<Sticker | null> {
    try {
        // Compress first
        const compressedBlob = await compressImage(file);

        // Force WebP extension
        const fileExt = "webp";
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Upload
        const { publicUrl } = await storageService.upload(BUCKETS.STICKERS, fileName, compressedBlob);

        // Create DB Record
        const insertPayload: any = {
            user_id: userId,
            image_url: publicUrl,
            prompt: "Admin Upload"
        };
        if (packId) insertPayload.pack_id = packId;

        const { data, error } = await supabase
            .from('user_stickers')
            .insert(insertPayload)
            .select()
            .single();

        if (error) {
            console.error('Upload Error DB:', error);
            throw error;
        }

        return data as Sticker;
    } catch (error) {
        console.error("Upload failed in uploadAdminSticker:", error);
        return null;
    }
}
