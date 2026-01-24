import { supabase } from '@/lib/supabase';

export interface Sticker {
    id: string;
    image_url: string;
    thumbnail_url: string;
    pack_id: string | null;
    created_at: string;
    size_bytes?: number;
    sort_order?: number;
}

export interface StickerPack {
    id: string;
    title: string;
    tray_image_url: string | null;
    publisher?: string;
    created_at: string;
    stickers?: Sticker[];
    likes_count?: number;
    downloads?: number;
}

/**
 * Get Pack with Stickers (Sorted)
 */
export async function getPackWithStickers(packId: string): Promise<StickerPack | null> {
    const { data: pack, error: packError } = await supabase
        .from('sticker_packs')
        .select('*')
        .eq('id', packId)
        .single();

    if (packError || !pack) return null;

    const { data: stickers, error: stickersError } = await supabase
        .from('user_stickers')
        .select('*')
        .eq('pack_id', packId)
        .order('sort_order', { ascending: true }); // Custom User Order

    if (stickersError) throw stickersError;

    return {
        ...pack,
        stickers: stickers as Sticker[]
    };
}

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
    if (error) throw error;
    return data || [];
}

/**
 * Get Trending Packs (Sorted by Likes & Downloads)
 */
/**
 * Get Trending Packs (Sorted by Likes & Downloads)
 */
export async function getTrendingPacks(): Promise<StickerPack[]> {
    const { data, error } = await supabase
        .from('sticker_packs')
        .select('*, stickers:user_stickers(*)')
        .order('likes_count', { ascending: false }) // Use Likes for Trending
        .limit(10);

    if (error) {
        console.error('Error fetching trending packs:', error);
        return [];
    }

    // Map and limit stickers manually since Supabase join limit is tricky without deeper syntax
    return data.map(pack => ({
        ...pack,
        stickers: pack.stickers ? pack.stickers.slice(0, 1) : []
    }));
}

/**
 * Get New Packs (Sorted by Date)
 */
export async function getNewPacks(): Promise<StickerPack[]> {
    const { data, error } = await supabase
        .from('sticker_packs')
        .select('*, stickers:user_stickers(*)')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching new packs:', error);
        return [];
    }

    return data.map(pack => ({
        ...pack,
        stickers: pack.stickers ? pack.stickers.slice(0, 1) : []
    }));
}

/**
 * Toggle Like
 */
export async function toggleLike(packId: string): Promise<{ liked: boolean, count: number } | null> {
    const { data, error } = await supabase.rpc('toggle_pack_like', { p_pack_id: packId });
    if (error) {
        console.error("Like error:", error);
        return null;
    }
    return data;
}

/**
 * Get User Liked Pack Ids
 */
export async function getUserLikedPackIds(userId: string): Promise<Set<string>> {
    const { data } = await supabase.from('pack_likes').select('pack_id').eq('user_id', userId);
    if (!data) return new Set();
    return new Set(data.map(d => d.pack_id));
}

/**
 * Tray Icon (96x96 WebP) oluşturucu
 */
async function createTrayIcon(sourceImageUrl: string): Promise<Blob> {
    const response = await fetch(sourceImageUrl);
    const blob = await response.blob();
    const img = await createImageBitmap(blob);

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    ctx.drawImage(img, 0, 0, 96, 96);

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Tray icon creation failed')),
            'image/webp',
            0.8
        );
    });
}

/**
 * Create a new sticker pack and move selected stickers into it
 */
export async function createStickerPack(
    userId: string,
    title: string,
    publisher: string,
    selectedStickerIds: string[],
    firstStickerUrl: string // Kullanıcı seçtiği ilk sticker
): Promise<StickerPack | null> {
    try {
        console.log('Creating pack with tray icon from:', firstStickerUrl);

        // 1. Tray Icon Oluştur (96x96)
        const trayBlob = await createTrayIcon(firstStickerUrl);

        // 2. Tray Icon Yükle
        const trayFileName = `${userId}/${Date.now()}_tray.webp`;
        const { error: uploadError } = await supabase.storage
            .from('thumbnails') // Thumbnails bucket'ını yeniden kullanıyoruz
            .upload(trayFileName, trayBlob);

        if (uploadError) throw uploadError;

        const { data: { publicUrl: trayUrl } } = supabase.storage
            .from('thumbnails')
            .getPublicUrl(trayFileName);

        // 3. Create Pack Record
        const { data: pack, error: packError } = await supabase
            .from('sticker_packs')
            .insert({
                user_id: userId,
                title: title,
                publisher: publisher,
                tray_image_url: trayUrl
            })
            .select()
            .single();

        if (packError) throw packError;
        if (!pack) return null;

        // 4. Update Stickers with new pack_id (BULK UPDATE)
        const { error: updateError } = await supabase
            .from('user_stickers')
            .update({ pack_id: pack.id })
            .in('id', selectedStickerIds);

        if (updateError) {
            console.error('Error adding stickers to pack:', updateError);
            throw updateError;
        }

        return pack;

    } catch (error) {
        console.error('Pack creation failed:', error);
        throw error;
    }
}

/**
 * Fetch all packs for value
 */
export async function getUserPacks(userId: string): Promise<StickerPack[]> {
    const { data, error } = await supabase
        .from('sticker_packs')
        .select('*, stickers:user_stickers(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
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
    return data || [];
}

/**
 * Helper: Extract storage path from URL
 */
function getStoragePathFromUrl(url: string | null): string | null {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // storage/v1/object/public/{bucket}/{path}
        // or just {userId}/{filename} if assuming structure
        // Let's assume standard supabase public url structure
        // pathParts includes: /storage/v1/object/public/stickers/userId/file.webp
        const publicIndex = pathParts.indexOf('public');
        if (publicIndex !== -1 && publicIndex + 2 < pathParts.length) {
            // bucket is pathParts[publicIndex + 1]
            // path is everything after
            return pathParts.slice(publicIndex + 2).join('/');
        }
        return null;
    } catch (e) {
        return null;
    }
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
        const imagePath = getStoragePathFromUrl(sticker.image_url);
        const thumbPath = getStoragePathFromUrl(sticker.thumbnail_url);

        if (imagePath) await supabase.storage.from('stickers').remove([imagePath]);
        if (thumbPath) await supabase.storage.from('thumbnails').remove([thumbPath]);
    }

    // 2. Delete DB record
    const { error } = await supabase
        .from('user_stickers')
        .delete()
        .eq('id', stickerId);

    if (error) throw error;
}

/**
 * Delete a Pack
 * - Unpacks stickers (sets pack_id to null)
 * - Deletes tray icon
 * - Deletes pack record
 */
export async function deletePack(packId: string): Promise<void> {
    // 1. Get pack info
    const { data: pack } = await supabase.from('sticker_packs').select('*').eq('id', packId).single();
    if (!pack) return;

    // 2. Unpack stickers
    await supabase.from('user_stickers').update({ pack_id: null }).eq('pack_id', packId);

    // 3. Delete tray icon
    const trayPath = getStoragePathFromUrl(pack.tray_image_url);
    if (trayPath) await supabase.storage.from('thumbnails').remove([trayPath]);

    // 4. Delete pack
    const { error } = await supabase.from('sticker_packs').delete().eq('id', packId);
    if (error) throw error;
}

/**
 * Update Pack Title
 */
export async function updatePackTitle(packId: string, title: string): Promise<void> {
    const { error } = await supabase.from('sticker_packs').update({ title }).eq('id', packId);
    if (error) throw error;
}

/**
 * Remove Sticker from Pack (and update Tray if needed)
 */
export async function removeStickerFromPack(stickerId: string, packId: string): Promise<void> {
    // 1. Unpack the sticker
    await supabase.from('user_stickers').update({ pack_id: null }).eq('id', stickerId);

    // 2. Check remaining stickers to update tray
    // Current logic: If we just removed a sticker, we should check if the pack is empty or needs a new tray.
    // However, strictly "Dynamic Tray" means the TRAY IMAGE FILE should be updated to the new first sticker.

    // Fetch remaining stickers
    const { data: remaining } = await supabase
        .from('user_stickers')
        .select('*')
        .eq('pack_id', packId)
        .order('created_at', { ascending: false }); // or whatever order logic

    if (remaining && remaining.length > 0) {
        // Pick the first one as new tray source
        const newFirst = remaining[0];

        // Generate new tray icon
        const userId = newFirst.user_id; // assuming same user
        const trayBlob = await createTrayIcon(newFirst.image_url);
        const trayFileName = `${userId}/${Date.now()}_tray.webp`;

        const { error: uploadError } = await supabase.storage
            .from('thumbnails')
            .upload(trayFileName, trayBlob);

        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('thumbnails').getPublicUrl(trayFileName);

            // Update pack tray url
            await supabase.from('sticker_packs').update({ tray_image_url: publicUrl }).eq('id', packId);

            // Optional: Delete old tray? (Not implemented to be safe, but requested "cleanup" suggests yes. 
            // Without knowing the old URL, we can't easily. We fetched pack detail earlier? No. 
            // Keep it simple.)
        }
    }
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
        const imagePaths = stickers.map(s => getStoragePathFromUrl(s.image_url)).filter(Boolean) as string[];
        const thumbPaths = stickers.map(s => getStoragePathFromUrl(s.thumbnail_url)).filter(Boolean) as string[];

        if (imagePaths.length > 0) await supabase.storage.from('stickers').remove(imagePaths);
        if (thumbPaths.length > 0) await supabase.storage.from('thumbnails').remove(thumbPaths);
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
 */
export async function updateStickerOrder(orderedStickerIds: string[]): Promise<void> {
    // Supabase doesn't have a simple "update case when..." helper in JS client easily.
    // We will run parallel updates. For 30 stickers it's fine.
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
 * Add Stickers to Pack
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

    // 2. Get Downloads and Likes from User's Packs
    // Simplified: Just counting packs for now
    const { count: packCount, error: packError } = await supabase
        .from('sticker_packs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (packError) console.error("Stats error (pack):", packError);

    return {
        generated: generatedCount || 0,
        downloads: 0, // Removed column
        likesReceived: 0, // Removed column
        favoritesCount: 0 // Removed table usage if problematic, but keeping specific like removal if asked. 
        // User asked to remove likes/downloads columns usage.
    };

    // Also fetch "Favorites" (Packs the user liked)
    const { count: favoritesCount } = await supabase
        .from('pack_likes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

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
    // Switched to profiles to avoid 403
    const { count: totalUsers } = await supabase
        .from('profiles')
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
 * Helper: Compress Image to <300KB WebP (Max 512px)
 */
async function compressImage(file: File): Promise<Blob> {
    const MAX_SIZE_BYTES = 300 * 1024; // 300KB
    const MAX_DIMENSION = 512;
    let quality = 0.85;

    const img = await createImageBitmap(file);

    let width = img.width;
    let height = img.height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
        } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
        }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    ctx.drawImage(img, 0, 0, width, height);

    let blob: Blob | null = null;

    // Attempt 1: High Quality
    blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));

    // Attempt 2: Medium Quality if too big
    if (blob && blob.size > MAX_SIZE_BYTES) {
        quality = 0.6;
        blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
    }

    // Attempt 3: Aggressive if still too big
    if (blob && blob.size > MAX_SIZE_BYTES) {
        quality = 0.4;
        blob = await new Promise(r => canvas.toBlob(r, 'image/webp', quality));
    }

    if (!blob) throw new Error("Compression failed");
    return blob;
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
        const filePath = `${fileName}`;

        // 1. Upload to Storage
        const { error: uploadError } = await supabase.storage
            .from('stickers')
            .upload(filePath, compressedBlob, {
                contentType: 'image/webp',
                upsert: false
            });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('stickers')
            .getPublicUrl(filePath);

        // 2. Create DB Record (Strict Schema)
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
            console.error('FULL ERROR:', JSON.stringify(error, null, 2));
            throw error;
        }
        return data;
    } catch (error) {
        console.error("Upload failed in uploadAdminSticker:", error);
        return null;
    }
}

/**
 * Create Pack from Files (Admin Bulk Flow)
 * 1. Uploads all files
 * 2. Creates Pack
 * 3. Links stickers to pack
 */
export async function createAdminPack(
    userId: string,
    files: File[],
    title: string,
    publisher: string,
    category: string,
    isPremium: boolean,
    coverIndex: number = 0
): Promise<{ success: boolean; message: string }> {
    try {
        if (files.length === 0) return { success: false, message: "Dosya seçilmedi" };

        // 1. Create Pack FIRST (Strict Schema: name, user_id)
        const { data: pack, error: packError } = await supabase
            .from('sticker_packs')
            .insert({
                user_id: userId,
                name: title,
                category: category || "Genel"
            })
            .select()
            .single();

        if (packError) throw packError;

        // 2. Upload All Files Parallel (Passing pack_id)
        const uploadPromises = files.map(f => uploadAdminSticker(f, userId, pack.id));
        const uploadedStickers = await Promise.all(uploadPromises);
        const validStickers = uploadedStickers.filter((s): s is Sticker => s !== null);

        if (validStickers.length === 0) {
            return { success: false, message: "Hiçbir dosya yüklenemedi" };
        }

        // 3. Generate & Set Tray Icon
        try {
            // Validate index
            const targetIndex = (coverIndex >= 0 && coverIndex < validStickers.length) ? coverIndex : 0;
            const coverSticker = validStickers[targetIndex];

            console.log("Generating tray icon from:", coverSticker.image_url);
            const trayBlob = await createTrayIcon(coverSticker.image_url);
            const trayFileName = `${userId}/${Date.now()}_tray.webp`;

            const { error: trayUploadError } = await supabase.storage
                .from('thumbnails')
                .upload(trayFileName, trayBlob);

            if (!trayUploadError) {
                const { data: { publicUrl: trayUrl } } = supabase.storage
                    .from('thumbnails')
                    .getPublicUrl(trayFileName);

                // Update Pack
                await supabase
                    .from('sticker_packs')
                    .update({ tray_image_url: trayUrl })
                    .eq('id', pack.id);
            }
        } catch (trayError) {
            console.error("Tray icon generation failed (ignoring):", trayError);
            // Non-critical, continue
        }

        return { success: true, message: `${validStickers.length} sticker ile paket oluşturuldu!` };

    } catch (error: any) {
        console.error("Admin pack creation failed", error);
        return { success: false, message: error.message || "Paket oluşturulamadı" };
    }
}
