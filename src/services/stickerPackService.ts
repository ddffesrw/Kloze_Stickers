/**
 * Sticker Pack Service
 * Supabase'den sticker pack'lerini yönetir
 */

import { supabase, type Database } from '@/lib/supabase';
import type { StickerPackInfo } from './whatsappStickerService';

export type StickerPack = Database['public']['Tables']['sticker_packs']['Row'] & {
  stickers: Database['public']['Tables']['stickers']['Row'][];
};

/**
 * Tüm sticker pack'lerini getir
 */
export async function getAllStickerPacks(): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      stickers:user_stickers (
        id,
        pack_id,
        image_url
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Sticker pack getirme hatası:', error);
    throw error;
  }

  return data as StickerPack[];
}

/**
 * ID'ye göre sticker pack getir
 */
export async function getStickerPackById(packId: string): Promise<StickerPack | null> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      stickers:user_stickers (
        id,
        pack_id,
        image_url
      )
    `)
    .eq('id', packId)
    .single();

  if (error) {
    console.error('Sticker pack getirme hatası:', error);
    return null;
  }

  return data as StickerPack;
}

/**
 * Kategoriye göre sticker pack'leri getir
 */
export async function getStickerPacksByCategory(category: string): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      stickers:user_stickers (
        id,
        pack_id,
        image_url
      )
    `)
    .eq('category', category)
    .order('downloads', { ascending: false });

  if (error) {
    console.error('Kategori sticker pack getirme hatası:', error);
    throw error;
  }

  return data as StickerPack[];
}

/**
 * Trending (en popüler) sticker pack'leri getir
 */
export async function getTrendingStickerPacks(limit: number = 10): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      stickers:user_stickers (
        id,
        pack_id,
        image_url
      )
    `)
    .order('downloads', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Trending pack getirme hatası:', error);
    throw error;
  }

  return data as StickerPack[];
}

/**
 * Arama yap
 */
export async function searchStickerPacks(query: string): Promise<StickerPack[]> {
  const { data, error } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      stickers:user_stickers (
        id,
        pack_id,
        image_url
      )
    `)
    .or(`name.ilike.%${query}%,publisher.ilike.%${query}%,category.ilike.%${query}%`)
    .order('downloads', { ascending: false });

  if (error) {
    console.error('Arama hatası:', error);
    throw error;
  }

  return data as StickerPack[];
}

/**
 * Download sayısını artır
 */
export async function incrementDownloadCount(packId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_downloads', {
    pack_id: packId
  });

  if (error) {
    console.error('Download count artırma hatası:', error);
  }
}

/**
 * Supabase StickerPack'i WhatsApp formatına çevir
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
        emojis: []
      })),
    publisherWebsite: 'https://kloze.app',
    privacyPolicyWebsite: 'https://kloze.app/privacy',
    licenseAgreementWebsite: 'https://kloze.app/terms'
  };
}

/**
 * Yeni sticker pack oluştur
 */
export async function createStickerPack(
  pack: Database['public']['Tables']['sticker_packs']['Insert'],
  stickers: { image_url: string; emojis: string[]; order_index: number }[]
): Promise<StickerPack> {
  // Pack'i oluştur
  const { data: packData, error: packError } = await supabase
    .from('sticker_packs')
    .insert(pack)
    .select()
    .single();

  if (packError) throw packError;

  // Sticker'ları ekle
  const stickerInserts = stickers.map(sticker => ({
    image_url: sticker.image_url,
    pack_id: packData.id,
    user_id: packData.user_id // Assuming pack has user_id, which it should
  }));

  const { data: stickerData, error: stickerError } = await supabase
    .from('user_stickers')
    .insert(stickerInserts)
    .select();

  if (stickerError) throw stickerError;

  return {
    ...packData,
    stickers: stickerData
  } as StickerPack;
}

/**
 * Sticker pack'i sil
 */
export async function deleteStickerPack(packId: string): Promise<void> {
  // Önce sticker'ları sil
  const { error: stickerError } = await supabase
    .from('user_stickers')
    .delete()
    .eq('pack_id', packId);

  if (stickerError) throw stickerError;

  // Sonra pack'i sil
  const { error: packError } = await supabase
    .from('sticker_packs')
    .delete()
    .eq('id', packId);

  if (packError) throw packError;
}
