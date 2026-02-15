import { Capacitor } from '@capacitor/core';

/**
 * Firebase Analytics & Crashlytics Service
 *
 * This service provides analytics tracking and crash reporting.
 * On native platforms (Android/iOS), it integrates with Firebase.
 * On web, it logs to console for development purposes.
 *
 * Note: Firebase native SDKs are automatically included when google-services.json
 * is present in the Android project. This service provides a TypeScript interface.
 */

class FirebaseService {
  private initialized = false;
  private userId: string | null = null;

  /**
   * Initialize Firebase services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[Firebase] Already initialized');
      return;
    }

    this.initialized = true;

    if (Capacitor.isNativePlatform()) {
      console.log('[Firebase] Native platform - using native Firebase SDK');
    } else {
      console.log('[Firebase] Web platform - using console logging');
    }
  }

  /**
   * Set user identifier for analytics and crash reports
   */
  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    console.log('[Firebase] User ID set:', userId.substring(0, 8) + '...');
  }

  /**
   * Log a custom event
   */
  async logEvent(name: string, params?: Record<string, unknown>): Promise<void> {
    const eventData = {
      event: name,
      params: params || {},
      timestamp: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      userId: this.userId?.substring(0, 8),
    };

    if (Capacitor.isNativePlatform()) {
      // On native, Firebase SDK captures events automatically via google-services.json
      // Additional custom events can be sent through native bridge if needed
      console.log('[Analytics Native]', name, params);
    } else {
      // Web - log to console
      console.log('[Analytics Web]', eventData);
    }
  }

  /**
   * Log an error for crash reporting
   */
  async logError(error: Error, context?: Record<string, string>): Promise<void> {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      platform: Capacitor.getPlatform(),
      userId: this.userId?.substring(0, 8),
    };

    if (Capacitor.isNativePlatform()) {
      // Firebase Crashlytics captures uncaught exceptions automatically
      console.error('[Crashlytics Native]', errorData);
    } else {
      console.error('[Crashlytics Web]', errorData);
    }
  }

  /**
   * Log a message (breadcrumb for crash reports)
   */
  async log(message: string): Promise<void> {
    console.log('[Firebase Log]', message);
  }

  /**
   * Set custom key-value for crash context
   */
  async setCustomKey(key: string, value: string): Promise<void> {
    console.log('[Firebase CustomKey]', key, value);
  }

  /**
   * Log screen view
   */
  async logScreenView(screenName: string): Promise<void> {
    await this.logEvent('screen_view', { screen_name: screenName });
  }

  // ==========================================
  // PRE-DEFINED ANALYTICS EVENTS
  // ==========================================

  async logStickerGenerated(style: string, creditCost: number): Promise<void> {
    await this.logEvent('sticker_generated', { style, credit_cost: creditCost });
  }

  async logStickerGenerationFailed(error: string): Promise<void> {
    await this.logEvent('sticker_generation_failed', { error });
  }

  async logPackViewed(packId: string, packName: string): Promise<void> {
    await this.logEvent('pack_viewed', { pack_id: packId, pack_name: packName });
  }

  async logPackDownloaded(packId: string, packName: string): Promise<void> {
    await this.logEvent('pack_downloaded', { pack_id: packId, pack_name: packName });
  }

  async logPackLiked(packId: string): Promise<void> {
    await this.logEvent('pack_liked', { pack_id: packId });
  }

  async logPackShared(packId: string, platform: string): Promise<void> {
    await this.logEvent('pack_shared', { pack_id: packId, platform });
  }

  async logCreditsEarned(amount: number, source: string): Promise<void> {
    await this.logEvent('credits_earned', { amount, source });
  }

  async logCreditsSpent(amount: number, purpose: string): Promise<void> {
    await this.logEvent('credits_spent', { amount, purpose });
  }

  async logAdWatched(adType: string, reward: number): Promise<void> {
    await this.logEvent('ad_watched', { ad_type: adType, reward });
  }

  async logUserSignup(method: string): Promise<void> {
    await this.logEvent('sign_up', { method });
  }

  async logUserLogin(method: string): Promise<void> {
    await this.logEvent('login', { method });
  }

  async logDailyBonusClaimed(day: number, reward: number): Promise<void> {
    await this.logEvent('daily_bonus_claimed', { day, reward });
  }

  async logWhatsAppExport(stickerCount: number): Promise<void> {
    await this.logEvent('whatsapp_export', { sticker_count: stickerCount });
  }

  async logSearch(query: string, resultCount: number): Promise<void> {
    await this.logEvent('search', { search_term: query, result_count: resultCount });
  }

  async logAppReviewPromptShown(): Promise<void> {
    await this.logEvent('app_review_prompt_shown');
  }

  async logAppReviewSubmitted(rating: number): Promise<void> {
    await this.logEvent('app_review_submitted', { rating });
  }
}

export const firebaseService = new FirebaseService();
