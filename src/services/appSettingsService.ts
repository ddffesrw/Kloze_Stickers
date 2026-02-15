/**
 * App Settings Service
 * Dinamik uygulama ayarları yönetimi
 */

import { supabase } from '@/lib/supabase';

export interface AppSettings {
  // Kredi Ayarları
  credit_cost_per_sticker: number;      // Sticker başına kredi maliyeti (varsayılan: 1)
  credit_reward_per_ad: number;         // Reklam başına kazanılan kredi (varsayılan: 2)
  free_daily_credits: number;           // Günlük ücretsiz kredi (varsayılan: 3)
  new_user_bonus_credits: number;       // Yeni kullanıcı bonus kredisi (varsayılan: 10)

  // Sticker Paketi Ayarları
  min_stickers_per_pack: number;        // Paket başına min sticker (varsayılan: 3)
  max_stickers_per_pack: number;        // Paket başına max sticker (varsayılan: 30)

  // Reklam Ayarları
  ads_enabled: boolean;                 // Reklamlar aktif mi
  ad_cooldown_minutes: number;          // Reklamlar arası bekleme süresi (dakika)
  max_ads_per_day: number;              // Günlük max reklam izleme

  // Genel
  maintenance_mode: boolean;            // Bakım modu
  app_version_minimum: string;          // Minimum uygulama versiyonu

  // Özellikler
  is_maker_enabled: boolean;            // Sticker üretici açık mı? (False ise Coming Soon gösterir)
}

// Varsayılan ayarlar
export const DEFAULT_SETTINGS: AppSettings = {
  credit_cost_per_sticker: 1,
  credit_reward_per_ad: 1,
  free_daily_credits: 3,
  new_user_bonus_credits: 10,
  min_stickers_per_pack: 3,
  max_stickers_per_pack: 30,
  ads_enabled: true,
  ad_cooldown_minutes: 5,
  max_ads_per_day: 10,
  maintenance_mode: false,
  app_version_minimum: '1.0.0',
  is_maker_enabled: false,  // Varsayılan: Kapalı (Çok Yakında)
};

// Cache
let settingsCache: AppSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 dakika

/**
 * Tüm ayarları getir
 */
export async function getAppSettings(): Promise<AppSettings> {
  // Cache kontrolü
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .order('key');

    if (error) {
      console.warn('App settings fetch error, using defaults:', error);
      return DEFAULT_SETTINGS;
    }

    if (!data || data.length === 0) {
      // İlk kez - varsayılan ayarları oluştur
      await initializeSettings();
      return DEFAULT_SETTINGS;
    }

    // Parse settings
    const settings: AppSettings = { ...DEFAULT_SETTINGS };
    for (const row of data) {
      const key = row.key as keyof AppSettings;
      if (key in settings) {
        // Tip dönüşümü
        const defaultValue = DEFAULT_SETTINGS[key];
        if (typeof defaultValue === 'boolean') {
          (settings as any)[key] = row.value === 'true' || row.value === true;
        } else if (typeof defaultValue === 'number') {
          (settings as any)[key] = parseFloat(row.value) || defaultValue;
        } else {
          (settings as any)[key] = row.value;
        }
      }
    }

    // Cache güncelle
    settingsCache = settings;
    cacheTimestamp = Date.now();

    return settings;
  } catch (e) {
    console.error('getAppSettings error:', e);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Tek bir ayarı getir
 */
export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const settings = await getAppSettings();
  return settings[key];
}

/**
 * Ayarları güncelle (Admin only)
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<boolean> {
  try {
    const upserts = Object.entries(updates).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('app_settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) throw error;

    // Cache'i invalidate et
    settingsCache = null;
    cacheTimestamp = 0;

    return true;
  } catch (e) {
    console.error('updateSettings error:', e);
    return false;
  }
}

/**
 * Tek bir ayarı güncelle
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<boolean> {
  return updateSettings({ [key]: value } as Partial<AppSettings>);
}

/**
 * Varsayılan ayarları oluştur
 */
async function initializeSettings(): Promise<void> {
  const inserts = Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({
    key,
    value: String(value),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await supabase.from('app_settings').upsert(inserts, { onConflict: 'key' });
}

/**
 * Cache'i temizle
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Sticker başına kredi maliyetini getir
 */
export async function getCreditCostPerSticker(): Promise<number> {
  return getSetting('credit_cost_per_sticker');
}

/**
 * Reklam başına kazanılan krediyi getir
 */
export async function getCreditRewardPerAd(): Promise<number> {
  return getSetting('credit_reward_per_ad');
}
