/**
 * Sticker Pack Service
 * Supabase'den sticker pack'lerini yönetir
 * Centralized logic for all Pack operations
 */

import { supabase, type Database } from '@/lib/supabase';
import { storageService, BUCKETS } from './storageService';
import { createTrayIcon, compressImage } from '@/utils/imageUtils';
import type { StickerPackInfo } from './whatsappStickerService';
import { removeBackgroundWithRetry } from './backgroundRemovalService';
import { uploadAdminSticker, type Sticker } from './stickerService';

// Re-export or define types locally if needed, but using Database types is safer
export type DbStickerPack = Database['public']['Tables']['sticker_packs']['Row'];
export type DbSticker = Database['public']['Tables']['stickers']['Row'];

export interface StickerPack extends DbStickerPack {
  stickers: DbSticker[];
}

/**
 * Helper to map DB result to StickerPack type
 * Also ensures tray_image_url has a fallback to first sticker
 */
function mapPackWithStickers(pack: any): StickerPack {
  // Supabase can return the joined relation as 'stickers' or 'user_stickers' depending on query
  // Prioritize whatever array is available
  // The query uses `user_stickers(*)`, so it will likely be in `user_stickers`
  const stickers = pack.stickers || pack.user_stickers || [];

  // Should we transform user_stickers to stickers type if needed?
  // They are likely the same type structure (DbSticker)

  // Fallback: use first sticker's image as cover if tray_image_url is missing
  const coverUrl = pack.tray_image_url || ((stickers.length > 0) ? stickers[0].image_url : null) || null;

  return {
    ...pack,
    stickers,
    tray_image_url: coverUrl
  };
}

/**
 * Get All Sticker Packs
 */
export async function getAllStickerPacks(limit: number = 50): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      user_stickers (*)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Supabase Error:", error);
    throw error;
  }

  return (data || []).map(mapPackWithStickers);
}

/**
 * Get Pack by ID
 */
export async function getStickerPackById(packId: string): Promise<StickerPack | null> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      user_stickers (*)
    `)
    .eq('id', packId)
    .single();

  if (error) return null;

  const pack = mapPackWithStickers(data);
  if (pack.stickers) {
    (pack.stickers as any[]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  return pack;
}

/**
 * Get User Packs
 */
export async function getUserPacks(userId: string): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select('*, user_stickers(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapPackWithStickers);
}

/**
 * Get Trending Packs (with pagination)
 * Featured packs come first (sorted by display_downloads or downloads),
 * then non-featured packs sorted by downloads
 * offset=0 means first page (includes featured), offset>0 means only regular packs
 */
export async function getTrendingStickerPacks(limit: number = 10, offset: number = 0): Promise<StickerPack[]> {
  // First page: featured packs come first
  if (offset === 0) {
    let featured: StickerPack[] = [];
    try {
      const { data: featuredData, error: featuredError } = await supabase
        .from('sticker_packs')
        .select(`*, user_stickers (*)`)
        .eq('is_featured', true)
        .order('downloads', { ascending: false })
        .limit(limit);

      if (!featuredError && featuredData) {
        featured = featuredData.map(p => {
          const pack = mapPackWithStickers(p);
          return { ...pack, stickers: pack.stickers ? pack.stickers.slice(0, 3) : [] };
        });
      }
    } catch (e) {
      console.warn('[getTrending] Featured query failed, falling back to regular:', e);
    }

    const remaining = limit - featured.length;
    if (remaining <= 0) return featured.slice(0, limit);

    const featuredIds = featured.map(p => p.id);
    let query = supabase
      .from('sticker_packs')
      .select(`*, user_stickers (*)`)
      .order('downloads', { ascending: false })
      .limit(remaining);

    if (featuredIds.length > 0) {
      for (const id of featuredIds) {
        query = query.neq('id', id);
      }
    }

    const { data: regularData, error } = await query;
    if (error) throw error;

    const regular = (regularData || []).map(p => {
      const pack = mapPackWithStickers(p);
      return { ...pack, stickers: pack.stickers ? pack.stickers.slice(0, 3) : [] };
    });

    return [...featured, ...regular];
  }

  // Subsequent pages: only regular packs (skip featured, use offset)
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`*, user_stickers (*)`)
    .order('downloads', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data || []).map(p => {
    const pack = mapPackWithStickers(p);
    return { ...pack, stickers: pack.stickers ? pack.stickers.slice(0, 3) : [] };
  });
}

/**
 * Get New Packs (with pagination)
 */
export async function getNewStickerPacks(limit: number = 20, offset: number = 0): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select('*, user_stickers(*)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return (data || []).map(p => {
    const pack = mapPackWithStickers(p);
    return {
      ...pack,
      stickers: pack.stickers ? pack.stickers.slice(0, 3) : []
    };
  });
}

/**
 * Search Packs
 */
export async function searchStickerPacks(query: string, limit: number = 30): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      user_stickers (*)
    `)
    .or(`name.ilike.%${query}%,publisher.ilike.%${query}%,category.ilike.%${query}%`)
    .order('downloads', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapPackWithStickers);
}

/**
 * Increment Download Count
 */
export async function incrementDownloadCount(packId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_downloads', {
    pack_id: packId
  });
  if (error) console.error('Download count increment failed:', error);
}

/**
 * Toggle Like
 */
export async function togglePackLike(packId: string): Promise<{ liked: boolean, count: number } | null> {
  const { data, error } = await supabase.rpc('toggle_pack_like', { p_pack_id: packId });
  if (error) {
    console.error("Like toggle failed:", error);
    return null;
  }
  return data;
}

/**
 * Get Liked Pack IDs
 */
export async function getUserLikedPackIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('pack_likes').select('pack_id').eq('user_id', userId);
  if (!data) return new Set();
  return new Set(data.map(d => d.pack_id));
}

/**
 * Get Liked Packs (full pack data)
 */
export async function getLikedPacks(userId: string): Promise<StickerPack[]> {
  const { data: likes } = await supabase
    .from('pack_likes')
    .select('pack_id')
    .eq('user_id', userId);

  if (!likes || likes.length === 0) return [];

  const packIds = likes.map(l => l.pack_id);

  const { data: packs, error } = await supabase
    .from('sticker_packs')
    .select(`*, user_stickers(*)`)
    .in('id', packIds);

  if (error) {
    console.error('Liked packs fetch error:', error);
    return [];
  }

  return (packs || []).map(mapPackWithStickers);
}

/**
 * Create Sticker Pack
 */
export async function createStickerPack(
  userId: string,
  title: string,
  publisher: string,
  selectedStickerIds: string[],
  firstStickerUrl: string
): Promise<StickerPack | null> {
  try {
    const trayBlob = await createTrayIcon(firstStickerUrl);
    const trayFileName = `${userId}/${Date.now()}_tray.webp`;

    const { publicUrl: trayUrl } = await storageService.upload(
      BUCKETS.THUMBNAILS,
      trayFileName,
      trayBlob
    );

    const { data: pack, error: packError } = await supabase
      .from('sticker_packs')
      .insert({
        user_id: userId,
        name: title,
        publisher: publisher,
        tray_image_url: trayUrl,
        category: 'Genel'
      })
      .select()
      .single();

    if (packError) throw packError;
    if (!pack) return null;

    const { error: updateError } = await supabase
      .from('user_stickers')
      .update({ pack_id: pack.id })
      .in('id', selectedStickerIds);

    if (updateError) throw updateError;

    return getStickerPackById(pack.id);

  } catch (error) {
    console.error('Pack creation failed:', error);
    throw error;
  }
}

/**
 * Create Pack from Files (Admin Bulk Flow)
 */
export async function createAdminPack(
  userId: string,
  files: File[],
  title: string,
  publisher: string,
  category: string,
  isPremium: boolean,
  coverIndex: number = 0,
  shouldRemoveBg: boolean = false,
  applyCompression: boolean = true
): Promise<{ success: boolean; message: string }> {
  try {
    if (files.length === 0) return { success: false, message: "Dosya seçilmedi" };

    // 1. Upload Files First (Parallel)
    // We can't use uploadAdminSticker directly because it needs a packId for DB insert.
    // Instead, we'll upload to storage first, gather URLs, THEN create pack, THEN create sticker records.

    const uploadPromises = files.map(async (file, idx) => {
      try {
        let finalBlob: Blob = file;

        // Optional BG Removal
        if (shouldRemoveBg) {
          try {
            // Compress first to speed up BG removal? Or BG remove first?
            // Providing original file (or slightly compressed) to BG remover is usually better.
            // But let's compress lightly first to save memory if user uploads 4k images.
            const compressedInput = await compressImage(file, 0.8, 1024); // Initial resize to max 1024px
            finalBlob = await removeBackgroundWithRetry(compressedInput);
          } catch (bgError) {
            console.warn(`BG Remove failed for file ${idx}, using original`, bgError);
            // Fallback to original
          }
        }

        let compressedBlob = finalBlob;

        // Optional Compression (Default ON)
        if (applyCompression) {
          // If BG removed, use result. If not, compress original file.
          // If BG removed result is already small, compressImage handles it (optimizes quality)
          // But if we want RAW upload (no compression), we skip this block.
          compressedBlob = await compressImage(finalBlob instanceof File ? finalBlob : new File([finalBlob], "sticker.webp"));
        } else {
          // If user wants NO compression (upload as is), we just ensure it's a blob.
          // Warning: If BG removal ran, finalBlob is already a blob.
          // If BG removal didn't run, finalBlob is File.
          compressedBlob = finalBlob;
        }

        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`; // We still enforce proper naming
        const { publicUrl } = await storageService.upload(BUCKETS.STICKERS, fileName, compressedBlob);
        return { publicUrl, size: compressedBlob.size, success: true };
      } catch (e) {
        console.error("File upload failed", e);
        return { publicUrl: "", size: 0, success: false };
      }
    });

    const fileResults = await Promise.all(uploadPromises);
    const successfulUploads = fileResults.filter(r => r.success);

    if (successfulUploads.length === 0) {
      return { success: false, message: "Hiçbir dosya yüklenemedi" };
    }

    // 2. Generate Tray Icon (from cover index)
    let trayUrl = "";
    try {
      const targetIndex = (coverIndex >= 0 && coverIndex < successfulUploads.length) ? coverIndex : 0;
      const validCoverUrl = successfulUploads[targetIndex].publicUrl;

      const trayBlob = await createTrayIcon(validCoverUrl);
      const trayFileName = `${userId}/${Date.now()}_tray.webp`;
      const uploadResult = await storageService.upload(BUCKETS.THUMBNAILS, trayFileName, trayBlob);
      trayUrl = uploadResult.publicUrl;
    } catch (trayError) {
      console.error("Tray icon generation failed, using first image as fallback", trayError);
      trayUrl = successfulUploads[0].publicUrl; // Fallback to full image if tray gen fails
    }

    // 3. Create Pack (Single Insert with Tray URL)
    const { data: pack, error: packError } = await supabase
      .from('sticker_packs')
      .insert({
        user_id: userId,
        name: title,
        publisher: publisher, // Add publisher
        category: category || "Genel",
        tray_image_url: trayUrl, // Insert immediately
        is_premium: isPremium // If schema supports it
      })
      .select()
      .single();

    if (packError) throw packError;

    // 4. Create Sticker Records in DB
    const stickerInserts = successfulUploads.map(upload => ({
      user_id: userId,
      pack_id: pack.id,
      image_url: upload.publicUrl,
      prompt: "Admin Import",
      size_bytes: upload.size,
      width: 512,
      height: 512
    }));

    const { error: stickersError } = await supabase
      .from('user_stickers')
      .insert(stickerInserts);

    if (stickersError) {
      // If stickers fail, we might want to clean up the pack, but for now just report error
      console.error("Stockers insert failed", stickersError);
      return { success: false, message: "Paket oluşturuldu ama stickerlar eklenemedi." };
    }

    return { success: true, message: `${successfulUploads.length} sticker ile paket oluşturuldu!` };

  } catch (error: any) {
    console.error("Admin pack creation failed", error);
    return { success: false, message: error.message || "Paket oluşturulamadı" };
  }
}

/**
 * Update Pack Title
 */
/**
 * Update Pack Details (Title & Category)
 */
export async function updatePackDetails(packId: string, title?: string, category?: string): Promise<void> {
  const updates: any = {};
  if (title) updates.name = title;
  if (category) updates.category = category;

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('sticker_packs')
    .update(updates)
    .eq('id', packId);
  if (error) throw error;
}

/**
 * Admin: Update pack download count
 */
export async function adminUpdatePackDownloads(packId: string, downloads: number): Promise<boolean> {
  const { error } = await supabase
    .from('sticker_packs')
    .update({ downloads: Math.max(0, downloads) })
    .eq('id', packId);

  if (error) {
    console.error('Update downloads error:', error);
    return false;
  }
  return true;
}

/**
 * Admin: Increment/Decrement pack downloads
 */
export async function adminAdjustPackDownloads(packId: string, adjustment: number): Promise<{ success: boolean; newCount: number }> {
  // First get current count
  const { data: pack, error: fetchError } = await supabase
    .from('sticker_packs')
    .select('downloads')
    .eq('id', packId)
    .single();

  if (fetchError || !pack) {
    return { success: false, newCount: 0 };
  }

  const currentDownloads = pack.downloads || 0;
  const newDownloads = Math.max(0, currentDownloads + adjustment);

  const { error } = await supabase
    .from('sticker_packs')
    .update({ downloads: newDownloads })
    .eq('id', packId);

  if (error) {
    return { success: false, newCount: currentDownloads };
  }

  return { success: true, newCount: newDownloads };
}

/**
 * Admin: Toggle featured status
 */
export async function adminToggleFeatured(packId: string, featured: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('sticker_packs')
    .update({ is_featured: featured })
    .eq('id', packId);

  if (error) {
    console.error('Toggle featured error:', error);
    return false;
  }
  return true;
}

/**
 * Admin: Update display_downloads (shown to users instead of real count)
 * Pass null to use real download count
 */
export async function adminUpdateDisplayDownloads(packId: string, displayDownloads: number | null): Promise<boolean> {
  const { error } = await supabase
    .from('sticker_packs')
    .update({ display_downloads: displayDownloads })
    .eq('id', packId);

  if (error) {
    console.error('Update display downloads error:', error);
    return false;
  }
  return true;
}

/**
 * Admin: Update pack likes count
 */
export async function adminUpdatePackLikes(packId: string, likesCount: number): Promise<boolean> {
  const { error } = await supabase
    .from('sticker_packs')
    .update({ likes_count: Math.max(0, likesCount) })
    .eq('id', packId);

  if (error) {
    console.error('Update likes error:', error);
    return false;
  }
  return true;
}

/**
 * Delete Sticker Pack
 */
export async function deleteStickerPack(packId: string): Promise<void> {
  const pack = await getStickerPackById(packId);
  if (!pack) return;

  await supabase
    .from('user_stickers')
    .update({ pack_id: null })
    .eq('pack_id', packId);

  const trayPath = storageService.getPathFromUrl(pack.tray_image_url);
  if (trayPath) {
    await storageService.delete(BUCKETS.THUMBNAILS, [trayPath]).catch(e => console.warn("Tray delete failed", e));
  }

  const { error } = await supabase
    .from('sticker_packs')
    .delete()
    .eq('id', packId);

  if (error) throw error;
}

/**
 * Remove Sticker From Pack
 */
export async function removeStickerFromPack(stickerId: string, packId: string): Promise<void> {
  await supabase.from('user_stickers').update({ pack_id: null }).eq('id', stickerId);

  const { data: remaining } = await supabase
    .from('user_stickers')
    .select('*')
    .eq('pack_id', packId)
    .order('sort_order', { ascending: true })
    .limit(1);

  if (remaining && remaining.length > 0) {
    const newFirst = remaining[0];
    const trayBlob = await createTrayIcon(newFirst.image_url);
    const trayFileName = `${newFirst.user_id}/${Date.now()}_tray.webp`;

    const { publicUrl } = await storageService.upload(BUCKETS.THUMBNAILS, trayFileName, trayBlob);

    await supabase.from('sticker_packs').update({ tray_image_url: publicUrl }).eq('id', packId);
  } else {
    // Pack is empty, clear tray image
    await supabase.from('sticker_packs').update({ tray_image_url: null }).eq('id', packId);
  }
}

/**
 * Add Stickers to Existing Pack
 * Assigns selected stickers to a pack
 */
export async function addStickersToExistingPack(packId: string, stickerIds: string[]): Promise<{ success: boolean; message: string }> {
  try {
    if (stickerIds.length === 0) {
      return { success: false, message: "Eklenecek sticker seçilmedi" };
    }

    // Get current max sort_order in pack
    const { data: existingStickers } = await supabase
      .from('user_stickers')
      .select('sort_order, image_url')
      .eq('pack_id', packId)
      .order('sort_order', { ascending: false });

    const isEmpty = !existingStickers || existingStickers.length === 0;
    let nextSortOrder = (existingStickers?.[0]?.sort_order ?? -1) + 1;

    // Update each sticker to belong to this pack
    for (const stickerId of stickerIds) {
      await supabase.from('user_stickers').update({
        pack_id: packId,
        sort_order: nextSortOrder++
      }).eq('id', stickerId);
    }

    // If pack was empty, update tray image with the first added sticker
    if (isEmpty) {
      // Fetch the first sticker's details
      const { data: firstSticker } = await supabase
        .from('user_stickers')
        .select('image_url, user_id')
        .eq('id', stickerIds[0])
        .single();

      if (firstSticker) {
        const trayBlob = await createTrayIcon(firstSticker.image_url);
        const trayFileName = `${firstSticker.user_id}/${Date.now()}_tray.webp`;
        const { publicUrl } = await storageService.upload(BUCKETS.THUMBNAILS, trayFileName, trayBlob);

        await supabase.from('sticker_packs').update({ tray_image_url: publicUrl }).eq('id', packId);
      }
    }

    return { success: true, message: `${stickerIds.length} sticker pakete eklendi` };
  } catch (error: any) {
    console.error("Add stickers to pack failed", error);
    return { success: false, message: error.message || "Sticker eklenemedi" };
  }
}

/**
 * Update Pack Cover Image (Tray Icon)
 */
export async function updatePackCover(packId: string, stickerId: string): Promise<boolean> {
  try {
    // 1. Get sticker image URL
    const { data: sticker } = await supabase
      .from('user_stickers')
      .select('image_url, user_id')
      .eq('id', stickerId)
      .single();

    if (!sticker) return false;

    // 2. Generate tray icon blob
    const trayBlob = await createTrayIcon(sticker.image_url);
    const trayFileName = `${sticker.user_id}/${Date.now()}_tray.webp`;

    // 3. Upload to storage
    const { publicUrl } = await storageService.upload(BUCKETS.THUMBNAILS, trayFileName, trayBlob);

    // 4. Update pack
    const { error } = await supabase
      .from('sticker_packs')
      .update({ tray_image_url: publicUrl })
      .eq('id', packId);

    if (error) throw error;
    return true;
  } catch (e) {
    console.error("Update pack cover failed", e);
    return false;
  }
}

/**
 * WhatsApp Helper
 */
export function convertToWhatsAppFormat(pack: StickerPack): StickerPackInfo {
  return {
    identifier: `kloze_${pack.id.replace(/-/g, '')}`,
    name: pack.name,
    publisher: pack.publisher,
    trayImageUrl: pack.tray_image_url,
    stickers: pack.stickers
      .map(sticker => ({
        id: sticker.id,
        url: sticker.image_url,
        emojis: sticker.emojis || []
      })),
    publisherWebsite: 'https://kloze.app',
    privacyPolicyWebsite: 'https://kloze.app/privacy',
    licenseAgreementWebsite: 'https://kloze.app/terms'
  };
}

/**
 * Pro Leaderboard - Top 10 Pro creators by likes and downloads
 */
export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar: string;
  totalLikes: number;
  totalDownloads: number;
  packCount: number;
  score: number;
  isPro?: boolean;
}

export async function getProLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Get all sticker packs with aggregated stats by user
    const { data: packs, error: packsError } = await supabase
      .from('sticker_packs')
      .select('user_id, likes_count, downloads')
      .eq('is_public', true);

    if (packsError || !packs || packs.length === 0) {
      console.log("No packs found for leaderboard");
      return [];
    }

    // Aggregate by user
    const userStats: Record<string, { likes: number, downloads: number, packCount: number }> = {};

    for (const pack of packs) {
      if (!pack.user_id) continue;

      if (!userStats[pack.user_id]) {
        userStats[pack.user_id] = { likes: 0, downloads: 0, packCount: 0 };
      }

      userStats[pack.user_id].likes += pack.likes_count || 0;
      userStats[pack.user_id].downloads += pack.downloads || 0;
      userStats[pack.user_id].packCount += 1;
    }

    // Get user info for users with stats
    const userIds = Object.keys(userStats);
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, avatar_url, is_pro')
      .in('id', userIds);

    // Build leaderboard
    const leaderboard: LeaderboardEntry[] = [];

    for (const profile of profiles || []) {
      const stats = userStats[profile.id];
      if (!stats) continue;

      // Score = likes * 2 + downloads (weighting likes more)
      const score = stats.likes * 2 + stats.downloads;

      leaderboard.push({
        userId: profile.id,
        username: profile.email?.split('@')[0] || 'Kullanıcı',
        avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
        totalLikes: stats.likes,
        totalDownloads: stats.downloads,
        packCount: stats.packCount,
        score,
        isPro: profile.is_pro || false
      });
    }

    // Sort by score descending and take top 10
    return leaderboard.sort((a, b) => b.score - a.score).slice(0, 10);
  } catch (e) {
    console.error("Leaderboard fetch failed", e);
    return [];
  }
}

/**
 * Get Next Auto-Generated Pack Name
 * Format: {Category}_Pack_{Count+1}
 */
export async function getNextPackName(category: string): Promise<string> {
  const { count, error } = await supabase
    .from('sticker_packs')
    .select('*', { count: 'exact', head: true })
    .eq('category', category);

  if (error) {
    console.warn("Could not count packs for auto-naming", error);
    return `${category}_Pack_1`;
  }

  const nextIndex = (count || 0) + 1;
  // Ensure we handle spaces in category names if any (e.g. "Funny Cats" -> "Funny_Cats_Pack_1")
  const sanitizedCategory = category.replace(/\s+/g, '_');
  return `${sanitizedCategory}_Pack_${nextIndex}`;
}

/**
 * Get global platform stats (stickers, downloads, likes)
 */
export interface PlatformStats {
  totalStickers: number;
  totalDownloads: number;
  totalLikes: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    // Get aggregate pack stats (use display_downloads if admin set it, otherwise real downloads)
    const { data: packStats } = await supabase
      .from('sticker_packs')
      .select('downloads, display_downloads, likes_count');

    // Get total sticker count from stickers table
    const { count: stickerCount } = await supabase
      .from('stickers')
      .select('*', { count: 'exact', head: true });

    const totalStickers = stickerCount || 0;
    const totalDownloads = packStats?.reduce((sum, p) => sum + (p.display_downloads ?? p.downloads ?? 0), 0) || 0;
    const totalLikes = packStats?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;

    return {
      totalStickers,
      totalDownloads,
      totalLikes
    };
  } catch (e) {
    console.error("Failed to fetch platform stats:", e);
    return {
      totalStickers: 0,
      totalDownloads: 0,
      totalLikes: 0
    };
  }
}
