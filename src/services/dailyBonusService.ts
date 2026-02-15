import { supabase } from "@/lib/supabase";

export interface DailyBonusResult {
  canClaim: boolean;
  streakDays: number;
  bonusAmount: number;
  lastClaimDate: string | null;
  nextClaimTime: Date | null;
}

export interface ClaimResult {
  success: boolean;
  creditsEarned: number;
  newStreak: number;
  totalCredits: number;
}

/**
 * Check if user can claim daily bonus
 */
export async function checkDailyBonus(userId: string): Promise<DailyBonusResult> {
  try {
    // Get user's daily login record
    const { data: loginData, error } = await supabase
      .from('daily_logins')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking daily bonus:', error);
      throw error;
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!loginData) {
      // First time user - can claim
      return {
        canClaim: true,
        streakDays: 0,
        bonusAmount: 1,
        lastClaimDate: null,
        nextClaimTime: null
      };
    }

    const lastClaim = new Date(loginData.last_claim_date);
    const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());

    // Check if already claimed today
    if (lastClaimDay.getTime() === todayStart.getTime()) {
      // Already claimed today
      const tomorrow = new Date(todayStart);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        canClaim: false,
        streakDays: loginData.streak_days || 1,
        bonusAmount: calculateBonus(loginData.streak_days || 1),
        lastClaimDate: loginData.last_claim_date,
        nextClaimTime: tomorrow
      };
    }

    // Check if streak continues (claimed yesterday)
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);

    const streakContinues = lastClaimDay.getTime() === yesterday.getTime();
    const newStreak = streakContinues ? (loginData.streak_days || 0) + 1 : 1;

    return {
      canClaim: true,
      streakDays: loginData.streak_days || 0,
      bonusAmount: calculateBonus(newStreak),
      lastClaimDate: loginData.last_claim_date,
      nextClaimTime: null
    };

  } catch (error) {
    console.error('Daily bonus check error:', error);
    return {
      canClaim: false,
      streakDays: 0,
      bonusAmount: 1,
      lastClaimDate: null,
      nextClaimTime: null
    };
  }
}

/**
 * Calculate bonus - always 1 credit per day
 * Extra credits available via rewarded video
 */
function calculateBonus(streakDay: number): number {
  return 1;
}

/**
 * Claim daily bonus
 */
export async function claimDailyBonus(userId: string): Promise<ClaimResult> {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Single query for existing record
    const { data: existing } = await supabase
      .from('daily_logins')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Check if already claimed today
    if (existing) {
      const lastClaim = new Date(existing.last_claim_date);
      const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      if (lastClaimDay.getTime() === todayStart.getTime()) {
        return { success: false, creditsEarned: 0, newStreak: existing.streak_days || 1, totalCredits: 0 };
      }
    }

    // Calculate streak
    let newStreak = 1;
    if (existing) {
      const lastClaim = new Date(existing.last_claim_date);
      const lastClaimDay = new Date(lastClaim.getFullYear(), lastClaim.getMonth(), lastClaim.getDate());
      const yesterday = new Date(todayStart);
      yesterday.setDate(yesterday.getDate() - 1);
      if (lastClaimDay.getTime() === yesterday.getTime()) {
        newStreak = (existing.streak_days || 0) + 1;
      }
    }

    const bonusAmount = calculateBonus(newStreak);

    // Upsert + add credits in parallel
    const [upsertResult, creditResult] = await Promise.all([
      supabase.from('daily_logins').upsert({
        user_id: userId,
        last_claim_date: now.toISOString(),
        streak_days: newStreak,
        total_claims: (existing?.total_claims || 0) + 1,
        updated_at: now.toISOString()
      }, { onConflict: 'user_id' }),
      supabase.rpc('add_credits', { user_id: userId, amount: bonusAmount })
    ]);

    if (upsertResult.error) throw upsertResult.error;
    if (creditResult.error) throw creditResult.error;

    // Get new balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    return {
      success: true,
      creditsEarned: bonusAmount,
      newStreak,
      totalCredits: profile?.credits || 0
    };

  } catch (error) {
    console.error('Claim daily bonus error:', error);
    return { success: false, creditsEarned: 0, newStreak: 0, totalCredits: 0 };
  }
}

/**
 * Get streak info for display
 */
export function getStreakInfo(streakDays: number): { emoji: string; title: string; color: string } {
  if (streakDays >= 30) return { emoji: "🔥", title: "Efsane!", color: "text-red-500" };
  if (streakDays >= 14) return { emoji: "⚡", title: "Harika!", color: "text-yellow-500" };
  if (streakDays >= 7) return { emoji: "🌟", title: "Süper!", color: "text-purple-500" };
  if (streakDays >= 3) return { emoji: "✨", title: "Güzel!", color: "text-blue-500" };
  return { emoji: "🎁", title: "Hoşgeldin!", color: "text-green-500" };
}
