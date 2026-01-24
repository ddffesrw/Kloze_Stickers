/**
 * Credit System Service
 * Kullanıcı credit yönetimi ve kontrol
 */

import { supabase } from '@/lib/supabase';

export interface UserCredits {
  userId: string;
  credits: number;
  isPro: boolean;
}

/**
 * Kullanıcının mevcut credit'ini getir
 */
export async function getUserCredits(userId: string): Promise<UserCredits> {
  const { data, error } = await supabase
    .from('users')
    .select('id, credits, is_pro')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    userId: data.id,
    credits: data.credits || 0,
    isPro: data.is_pro || false
  };
}

/**
 * Credit düş (sticker generation için)
 */
export async function deductCredits(
  userId: string,
  amount: number = 1
): Promise<{ success: boolean; remainingCredits: number }> {
  // Mevcut credit'i kontrol et
  const currentCredits = await getUserCredits(userId);

  if (currentCredits.credits < amount) {
    throw new Error('Yetersiz kredi');
  }

  // Credit düş
  const { data, error } = await supabase
    .from('users')
    .update({ credits: currentCredits.credits - amount })
    .eq('id', userId)
    .select('credits')
    .single();

  if (error) throw error;

  return {
    success: true,
    remainingCredits: data.credits
  };
}

/**
 * Credit ekle (satın alma sonrası)
 */
export async function addCredits(
  userId: string,
  amount: number
): Promise<{ success: boolean; newBalance: number }> {
  const currentCredits = await getUserCredits(userId);

  const { data, error } = await supabase
    .from('users')
    .update({ credits: currentCredits.credits + amount })
    .eq('id', userId)
    .select('credits')
    .single();

  if (error) throw error;

  return {
    success: true,
    newBalance: data.credits
  };
}

/**
 * Credit kontrolü yap (generation öncesi)
 */
export async function checkCreditsBeforeGeneration(
  userId: string,
  requiredCredits: number = 1
): Promise<{ hasEnough: boolean; current: number; required: number }> {
  const credits = await getUserCredits(userId);

  return {
    hasEnough: credits.credits >= requiredCredits,
    current: credits.credits,
    required: requiredCredits
  };
}

/**
 * Pro kullanıcı mı kontrol et
 */
export async function isProUser(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits.isPro;
}

/**
 * Credit transaction kaydı oluştur (opsiyonel, analytics için)
 */
export async function logCreditTransaction(
  userId: string,
  amount: number,
  type: 'deduct' | 'add',
  reason: string
): Promise<void> {
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    amount: type === 'deduct' ? -amount : amount,
    type,
    reason,
    created_at: new Date().toISOString()
  });
}

/**
 * Günlük ücretsiz credit limiti (freemium model)
 */
export const FREE_DAILY_CREDITS = 3;
export const CREDIT_COST_PER_STICKER = 1;

/**
 * Günlük ücretsiz credit reset
 */
export async function resetDailyCredits(userId: string): Promise<void> {
  const credits = await getUserCredits(userId);

  // Pro kullanıcılar için unlimited
  if (credits.isPro) return;

  // Free kullanıcılar için günlük reset
  await supabase
    .from('users')
    .update({
      credits: FREE_DAILY_CREDITS,
      last_credit_reset: new Date().toISOString()
    })
    .eq('id', userId);
}
