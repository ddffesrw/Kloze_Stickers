/**
 * Sticker Pack Service
 * Supabase'den sticker pack'lerini yönetir
 * Centralized logic for all Pack operations
 */

import { supabase, type Database } from '@/lib/supabase';
import { storageService, BUCKETS } from './storageService';
import { createTrayIcon, compressImage } from '@/utils/imageUtils';
import type { StickerPackInfo } from './whatsappStickerService';
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
  const stickers = pack.user_stickers || [];
  // Fallback: use first sticker's image as cover if tray_image_url is missing
  const coverUrl = pack.tray_image_url || stickers[0]?.image_url || null;

  return {
    ...pack,
    stickers,
    tray_image_url: coverUrl
  };
}

/**
 * Get All Sticker Packs
 */
export async function getAllStickerPacks(): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      user_stickers (
        *
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
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
      user_stickers (
        *
      )
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
 * Get Trending Packs
 */
export async function getTrendingStickerPacks(limit: number = 10): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      user_stickers (
        *
      )
    `)
    .order('downloads', { ascending: false })
    .limit(limit);

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
 * Get New Packs
 */
export async function getNewStickerPacks(limit: number = 20): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select('*, user_stickers(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

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
export async function searchStickerPacks(query: string): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      user_stickers (
        *
      )
    `)
    .or(`name.ilike.%${query}%,publisher.ilike.%${query}%,category.ilike.%${query}%`)
    .order('downloads', { ascending: false });

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
 * Update Pack Title
 */
export async function updatePackTitle(packId: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('sticker_packs')
    .update({ name: title })
    .eq('id', packId);
  if (error) throw error;
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
    identifier: `kloze_${pack.id}`,
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
 * Create Pack from Files (Admin Bulk Flow)
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

    // 1. Upload Files First (Parallel)
    // We can't use uploadAdminSticker directly because it needs a packId for DB insert.
    // Instead, we'll upload to storage first, gather URLs, THEN create pack, THEN create sticker records.

    const uploadPromises = files.map(async (file) => {
      try {
        const compressedBlob = await compressImage(file);
        const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
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
