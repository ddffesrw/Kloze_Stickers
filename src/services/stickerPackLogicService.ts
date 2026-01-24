/**
 * Sticker Pack Logic Service
 * Pack oluşturma, validasyon ve WhatsApp'a gönderme logic'i
 */

import { supabase } from '@/lib/supabase';
import { addStickerPackToWhatsApp, type StickerPackInfo } from './whatsappStickerService';
import { incrementDownloadCount } from './stickerPackService';

export interface PackSticker {
  id: string;
  imageUrl: string;
  emojis?: string[];
}

export interface CreatePackOptions {
  name: string;
  publisher: string;
  category: string;
  stickers: PackSticker[];
  trayImageUrl?: string;  // Opsiyonel, yoksa ilk sticker kullanılır
  userId: string;
}

/**
 * Pack validasyonu
 */
export function validatePack(stickers: PackSticker[]): {
  isValid: boolean;
  error?: string;
} {
  // Minimum 3 sticker gerekli
  if (stickers.length < 3) {
    return {
      isValid: false,
      error: 'En az 3 sticker gerekli'
    };
  }

  // Maksimum 30 sticker
  if (stickers.length > 30) {
    return {
      isValid: false,
      error: 'Maksimum 30 sticker eklenebilir'
    };
  }

  // Her sticker'ın URL'i olmalı
  const hasInvalidSticker = stickers.some(s => !s.imageUrl);
  if (hasInvalidSticker) {
    return {
      isValid: false,
      error: 'Geçersiz sticker bulundu'
    };
  }

  return { isValid: true };
}

/**
 * "Add to WhatsApp" butonu aktif mi?
 */
export function canAddToWhatsApp(stickers: PackSticker[]): boolean {
  const validation = validatePack(stickers);
  return validation.isValid;
}

/**
 * Yeni sticker pack oluştur ve veritabanına kaydet
 */
export async function createStickerPack(
  options: CreatePackOptions
): Promise<string> {
  // Validasyon
  const validation = validatePack(options.stickers);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const packId = crypto.randomUUID();
  const trayImageUrl = options.trayImageUrl || options.stickers[0].imageUrl;

  // Pack'i veritabanına kaydet
  const { error: packError } = await supabase
    .from('sticker_packs')
    .insert({
      id: packId,
      name: options.name,
      publisher: options.publisher,
      category: options.category,
      creator_id: options.userId,
      creator_name: 'User Name', // TODO: User profile'dan çek
      creator_avatar: '', // TODO: User profile'dan çek
      tray_image_url: trayImageUrl,
      cover_image_url: options.stickers[0].imageUrl, // İlk sticker cover
      downloads: 0,
      is_premium: false
    });

  if (packError) throw packError;

  // Sticker'ları kaydet
  const stickerInserts = options.stickers.map((sticker, index) => ({
    pack_id: packId,
    image_url: sticker.imageUrl,
    emojis: sticker.emojis || [],
    order_index: index
  }));

  const { error: stickersError } = await supabase
    .from('stickers')
    .insert(stickerInserts);

  if (stickersError) throw stickersError;

  return packId;
}

/**
 * Pack'i WhatsApp'a gönder
 */
export async function addPackToWhatsApp(
  packId: string,
  onProgress?: (progress: any) => void
): Promise<{ success: boolean; message: string }> {
  // Pack'i veritabanından çek
  const { data: pack, error: packError } = await supabase
    .from('sticker_packs')
    .select(`
      *,
      stickers (
        id,
        image_url,
        emojis,
        order_index
      )
    `)
    .eq('id', packId)
    .single();

  if (packError || !pack) {
    throw new Error('Sticker pack bulunamadı');
  }

  // Validasyon
  const validation = validatePack(
    pack.stickers.map((s: any) => ({
      id: s.id,
      imageUrl: s.image_url,
      emojis: s.emojis
    }))
  );

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // WhatsApp formatına çevir
  const packInfo: StickerPackInfo = {
    identifier: `kloze_${packId}`,
    name: pack.name,
    publisher: pack.publisher,
    trayImageUrl: pack.tray_image_url,
    stickers: pack.stickers
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((s: any) => ({
        id: s.id,
        url: s.image_url,
        emojis: s.emojis
      })),
    publisherWebsite: 'https://kloze.app',
    privacyPolicyWebsite: 'https://kloze.app/privacy',
    licenseAgreementWebsite: 'https://kloze.app/terms'
  };

  // Native plugin ile WhatsApp'a gönder
  const result = await addStickerPackToWhatsApp(packInfo, onProgress);

  // Başarılı olursa download count'u artır
  if (result.success) {
    await incrementDownloadCount(packId);
  }

  return result;
}

/**
 * Kullanıcının draft pack'leri
 */
export async function getUserDraftPacks(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('draft_packs')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Draft pack kaydet (kullanıcı henüz publish etmemiş)
 */
export async function saveDraftPack(
  userId: string,
  name: string,
  stickers: PackSticker[]
): Promise<string> {
  const draftId = crypto.randomUUID();

  const { error } = await supabase
    .from('draft_packs')
    .insert({
      id: draftId,
      user_id: userId,
      name,
      stickers: JSON.stringify(stickers),
      updated_at: new Date().toISOString()
    });

  if (error) throw error;

  return draftId;
}

/**
 * Draft pack'i publish et (gerçek pack'e çevir)
 */
export async function publishDraftPack(
  draftId: string,
  options: Omit<CreatePackOptions, 'stickers'>
): Promise<string> {
  // Draft'ı çek
  const { data: draft, error } = await supabase
    .from('draft_packs')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error || !draft) {
    throw new Error('Draft bulunamadı');
  }

  const stickers = JSON.parse(draft.stickers);

  // Gerçek pack oluştur
  const packId = await createStickerPack({
    ...options,
    stickers
  });

  // Draft'ı sil
  await supabase
    .from('draft_packs')
    .delete()
    .eq('id', draftId);

  return packId;
}
