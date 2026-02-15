import { supabase } from "@/lib/supabase";

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  maxRequests: number;
  remaining: number;
  resetAt: Date;
}

// Rate limit configurations
export const RATE_LIMITS = {
  // Sticker generation limits
  STICKER_GENERATION: {
    actionType: 'sticker_generation',
    maxRequests: 20,        // Max 20 generations
    windowMinutes: 60       // Per hour
  },
  STICKER_GENERATION_FREE: {
    actionType: 'sticker_generation_free',
    maxRequests: 5,         // Free users: 5 per hour
    windowMinutes: 60
  },

  // Pack creation limits
  PACK_CREATE: {
    actionType: 'pack_create',
    maxRequests: 10,        // Max 10 packs
    windowMinutes: 60       // Per hour
  },

  // Download limits
  PACK_DOWNLOAD: {
    actionType: 'pack_download',
    maxRequests: 50,        // Max 50 downloads
    windowMinutes: 60       // Per hour
  },

  // Report limits (prevent spam)
  REPORT: {
    actionType: 'report',
    maxRequests: 5,         // Max 5 reports
    windowMinutes: 60       // Per hour
  },

  // Ad watch limits (prevent abuse)
  AD_WATCH: {
    actionType: 'ad_watch',
    maxRequests: 10,        // Max 10 ad watches
    windowMinutes: 60       // Per hour
  },

  // API call limits
  API_CALL: {
    actionType: 'api_call',
    maxRequests: 100,       // Max 100 API calls
    windowMinutes: 1        // Per minute
  }
} as const;

/**
 * Check if action is rate limited
 */
export async function checkRateLimit(
  userId: string,
  config: { actionType: string; maxRequests: number; windowMinutes: number }
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: userId,
      p_action_type: config.actionType,
      p_max_requests: config.maxRequests,
      p_window_minutes: config.windowMinutes
    });

    if (error) throw error;

    return {
      allowed: data.allowed,
      currentCount: data.current_count,
      maxRequests: data.max_requests,
      remaining: data.remaining,
      resetAt: new Date(data.reset_at)
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Default to allowing on error to not block users
    return {
      allowed: true,
      currentCount: 0,
      maxRequests: config.maxRequests,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMinutes * 60000)
    };
  }
}

/**
 * Increment rate limit counter
 */
export async function incrementRateLimit(
  userId: string,
  actionType: string
): Promise<void> {
  try {
    await supabase.rpc('increment_rate_limit', {
      p_user_id: userId,
      p_action_type: actionType
    });
  } catch (error) {
    console.error('Rate limit increment error:', error);
  }
}

/**
 * Helper: Check and increment in one call
 * Returns true if allowed, false if rate limited
 */
export async function consumeRateLimit(
  userId: string,
  config: { actionType: string; maxRequests: number; windowMinutes: number }
): Promise<{ allowed: boolean; result: RateLimitResult }> {
  const result = await checkRateLimit(userId, config);

  if (result.allowed) {
    await incrementRateLimit(userId, config.actionType);
  }

  return { allowed: result.allowed, result };
}

/**
 * Format time until reset
 */
export function formatResetTime(resetAt: Date): string {
  const now = new Date();
  const diff = resetAt.getTime() - now.getTime();

  if (diff <= 0) return 'Şimdi';

  const minutes = Math.ceil(diff / 60000);

  if (minutes < 60) {
    return `${minutes} dakika`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} saat`;
  }

  return `${hours}s ${remainingMinutes}dk`;
}

/**
 * Get rate limit status message
 */
export function getRateLimitMessage(result: RateLimitResult, actionName: string): string {
  if (result.allowed) {
    return `${result.remaining}/${result.maxRequests} ${actionName} hakkın kaldı`;
  }

  return `${actionName} limitine ulaştın. ${formatResetTime(result.resetAt)} sonra tekrar dene.`;
}
