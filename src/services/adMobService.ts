import {
    AdMob,
    AdMobRewardItem,
    RewardAdPluginEvents
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Ad Unit IDs - Set VITE_ADMOB_REWARDED_ID in .env for production
const REWARDED_AD_UNIT_ID = import.meta.env.VITE_ADMOB_REWARDED_ID || "ca-app-pub-3940256099942544/5224354917";
const IS_TESTING = import.meta.env.VITE_ADMOB_TESTING !== 'false';

class AdMobService {
    private static instance: AdMobService;
    private isInitialized = false;
    private isAdReady = false;
    private initPromise: Promise<void> | null = null;

    private constructor() { }

    public static getInstance(): AdMobService {
        if (!AdMobService.instance) {
            AdMobService.instance = new AdMobService();
        }
        return AdMobService.instance;
    }

    /**
     * AdMob'u başlat - lazy initialization (only when needed)
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (!Capacitor.isNativePlatform()) {
            console.log("AdMob: Web platformunda çalışmıyor");
            this.isInitialized = true;
            return;
        }

        // Prevent multiple concurrent initializations
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                await AdMob.initialize({
                    initializeForTesting: IS_TESTING,
                });
                this.isInitialized = true;
                console.log("AdMob başlatıldı");

                // Preload first ad
                await this.prepareRewardVideo();
            } catch (e) {
                console.error("AdMob başlatma hatası:", e);
                this.isInitialized = true; // Mark initialized to prevent retry loops
            } finally {
                this.initPromise = null;
            }
        })();

        return this.initPromise;
    }

    /**
     * Ödüllü reklamı hazırla (preload)
     */
    public async prepareRewardVideo(): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;
        if (!this.isInitialized) return;

        try {
            await AdMob.prepareRewardVideoAd({
                adId: REWARDED_AD_UNIT_ID,
                isTesting: IS_TESTING
            });
            this.isAdReady = true;
            console.log("Ödüllü reklam hazır");
        } catch (e) {
            console.error("Ödüllü reklam hazırlama hatası:", e);
            this.isAdReady = false;
        }
    }

    /**
     * Ödüllü reklam göster
     * Lazy-initializes AdMob if not yet initialized.
     */
    public async showRewardVideo(): Promise<AdMobRewardItem | null> {
        // Web platform: fake reward for testing
        if (!Capacitor.isNativePlatform()) {
            console.log("Web'de test: Sahte ödül veriliyor");
            await new Promise(r => setTimeout(r, 1000));
            return { type: 'test', amount: 1 };
        }

        // Lazy init - only initialize when user actually wants to watch an ad
        if (!this.isInitialized) {
            await this.initialize();
        }

        // If ad isn't ready, try to prepare it now
        if (!this.isAdReady) {
            await this.prepareRewardVideo();
        }

        if (!this.isAdReady) {
            console.warn("Reklam hazır değil, gösterilemiyor");
            return null;
        }

        return new Promise(async (resolve) => {
            let rewardHandler: any, dismissHandler: any, failHandler: any;
            let resolved = false;

            const cleanup = () => {
                rewardHandler?.remove();
                dismissHandler?.remove();
                failHandler?.remove();
            };

            // Safety timeout - 30s
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    cleanup();
                    resolve(null);
                    this.isAdReady = false;
                    this.prepareRewardVideo();
                }
            }, 30000);

            try {
                rewardHandler = await AdMob.addListener(
                    RewardAdPluginEvents.Rewarded,
                    (reward: AdMobRewardItem) => {
                        if (resolved) return;
                        resolved = true;
                        clearTimeout(timeout);
                        console.log("Ödül alındı:", reward);
                        cleanup();
                        this.isAdReady = false;
                        resolve(reward);
                        this.prepareRewardVideo(); // Preload next ad
                    }
                );

                dismissHandler = await AdMob.addListener(
                    RewardAdPluginEvents.Dismissed,
                    () => {
                        if (resolved) return;
                        resolved = true;
                        clearTimeout(timeout);
                        cleanup();
                        this.isAdReady = false;
                        resolve(null);
                        this.prepareRewardVideo();
                    }
                );

                failHandler = await AdMob.addListener(
                    RewardAdPluginEvents.FailedToLoad,
                    (error: any) => {
                        if (resolved) return;
                        resolved = true;
                        clearTimeout(timeout);
                        console.error("Reklam yüklenemedi:", error);
                        cleanup();
                        this.isAdReady = false;
                        resolve(null);
                    }
                );

                await AdMob.showRewardVideoAd();

            } catch (e) {
                clearTimeout(timeout);
                console.error("Ödüllü reklam gösterme hatası:", e);
                cleanup();
                this.isAdReady = false;
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
                this.prepareRewardVideo();
            }
        });
    }

    public isReady(): boolean {
        return this.isInitialized && this.isAdReady;
    }
}

export const adMobService = AdMobService.getInstance();
