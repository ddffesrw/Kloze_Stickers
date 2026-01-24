/**
 * WhatsApp Stickers Plugin - Web Implementation
 * Web platformunda çalışmaz, sadece tip uyumluluğu için
 */

import { WebPlugin } from '@capacitor/core';
import type {
  WhatsAppStickersPlugin,
  AddStickerPackOptions,
  AddStickerPackResult
} from './definitions';

export class WhatsAppStickersWeb extends WebPlugin implements WhatsAppStickersPlugin {
  async addStickerPack(_options: AddStickerPackOptions): Promise<AddStickerPackResult> {
    return {
      success: false,
      message: 'WhatsApp Sticker ekleme sadece mobil platformlarda desteklenir',
      errorCode: 'PLATFORM_NOT_SUPPORTED'
    };
  }

  async isWhatsAppInstalled(): Promise<{ installed: boolean }> {
    return { installed: false };
  }
}
