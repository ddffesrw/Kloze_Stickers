/**
 * WhatsApp Stickers Plugin
 * WhatsApp'a sticker paketi ekleme için Capacitor plugin interface
 */

export interface WhatsAppStickersPlugin {
  /**
   * WhatsApp'a sticker paketi ekle
   * @param options - Sticker paketi bilgileri
   * @returns Promise<{ success: boolean; message: string }>
   */
  addStickerPack(options: AddStickerPackOptions): Promise<AddStickerPackResult>;

  /**
   * WhatsApp'ın yüklü olup olmadığını kontrol et
   * @returns Promise<{ installed: boolean }>
   */
  isWhatsAppInstalled(): Promise<{ installed: boolean }>;
}

export interface StickerFile {
  /**
   * Sticker dosya yolu (base64 veya file path)
   */
  data: string;

  /**
   * Emoji listesi (opsiyonel, max 3)
   */
  emojis?: string[];
}

export interface AddStickerPackOptions {
  /**
   * Sticker paketi benzersiz ID
   */
  identifier: string;

  /**
   * Paket adı (max 128 karakter)
   */
  name: string;

  /**
   * Yayıncı adı (max 128 karakter)
   */
  publisher: string;

  /**
   * Tray ikonu (96x96 png, base64)
   */
  trayImage: string;

  /**
   * Sticker dosyaları (3-30 adet, 512x512 webp)
   */
  stickers: StickerFile[];

  /**
   * Publisher website (opsiyonel)
   */
  publisherWebsite?: string;

  /**
   * Privacy policy URL (opsiyonel)
   */
  privacyPolicyWebsite?: string;

  /**
   * License agreement URL (opsiyonel)
   */
  licenseAgreementWebsite?: string;
}

export interface AddStickerPackResult {
  /**
   * İşlem başarılı mı?
   */
  success: boolean;

  /**
   * Mesaj
   */
  message: string;

  /**
   * Hata kodu (başarısız olursa)
   */
  errorCode?: string;
}
