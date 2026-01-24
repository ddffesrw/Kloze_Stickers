/**
 * WhatsApp Stickers Plugin
 * Export plugin instance
 */

import { registerPlugin } from '@capacitor/core';
import type { WhatsAppStickersPlugin } from './definitions';

const WhatsAppStickers = registerPlugin<WhatsAppStickersPlugin>('WhatsAppStickers', {
  web: () => import('./web').then(m => new m.WhatsAppStickersWeb()),
});

export * from './definitions';
export { WhatsAppStickers };
