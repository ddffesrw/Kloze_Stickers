
import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    AdMobRewardItem,
    RewardAdPluginEvents
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// TEST IDs (Replace with real IDs in production via .env)
const ADMOB_APP_ID = "ca-app-pub-3940256099942544~3347511713"; // Test App ID
const BANNER_AD_UNIT_ID = "ca-app-pub-3940256099942544/6300978111"; // Test Banner
const INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-3940256099942544/1033173712"; // Test Interstitial
const REWARDED_AD_UNIT_ID = "ca-app-pub-3940256099942544/5224354917"; // Test Rewarded

class AdMobService {
    private static instance: AdMobService;
    private isInitialized = false;
    private isPro = false;

    private constructor() { }

    public static getInstance(): AdMobService {
        if (!AdMobService.instance) {
            AdMobService.instance = new AdMobService();
        }
        return AdMobService.instance;
    }

    public updateProStatus(status: boolean) {
        this.isPro = status;
        if (this.isPro) {
            this.hideBanner();
        } else {
            this.showBanner();
        }
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;
        if (!Capacitor.isNativePlatform()) {
            console.log("AdMob skipped (Web)");
            return;
        }

        try {
            await AdMob.initialize({
                initializeForTesting: true,
            });
            this.isInitialized = true;
            console.log("AdMob Initialized");
        } catch (e) {
            console.error("AdMob Init Failed", e);
        }
    }

    // --- BANNER ---
    public async showBanner(): Promise<void> {
        if (!this.isInitialized || this.isPro) return;

        try {
            await AdMob.showBanner({
                adId: BANNER_AD_UNIT_ID,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: true
            });
        } catch (e) {
            console.error("Show Banner Failed", e);
        }
    }

    public async hideBanner(): Promise<void> {
        if (!this.isInitialized) return;
        try {
            await AdMob.hideBanner();
            await AdMob.removeBanner();
        } catch (e) {
            console.error("Hide Banner Failed", e);
        }
    }

    // --- INTERSTITIAL ---
    public async prepareInterstitial(): Promise<void> {
        if (!this.isInitialized || this.isPro) return;
        try {
            await AdMob.prepareInterstitial({
                adId: INTERSTITIAL_AD_UNIT_ID,
                isTesting: true
            });
        } catch (e) {
            console.error("Prepare Interstitial Failed", e);
        }
    }

    public async showInterstitial(): Promise<void> {
        if (!this.isInitialized || this.isPro) return;
        try {
            await AdMob.showInterstitial();
        } catch (e) {
            console.error("Show Interstitial Failed", e);
            this.prepareInterstitial();
        }
    }

    // --- REWARDED ---
    public async prepareRewardVideo(): Promise<void> {
        if (!this.isInitialized) return;
        try {
            await AdMob.prepareRewardVideoAd({
                adId: REWARDED_AD_UNIT_ID,
                isTesting: true
            });
        } catch (e) {
            console.error("Prepare Reward Failed", e);
        }
    }

    public async showRewardVideo(): Promise<AdMobRewardItem | null> {
        if (!this.isInitialized) return null;

        return new Promise(async (resolve) => {
            try {
                // Correct event names from enum
                const rewardHandler = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (item: AdMobRewardItem) => {
                    resolve(item);
                    rewardHandler.remove();
                });

                const closeHandler = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                    closeHandler.remove();
                    // If not resolved yet (closed without reward), we might want to resolve null here?
                    // But let's assume reward fires first if successful.
                });

                await AdMob.showRewardVideoAd();
            } catch (e) {
                console.error("Show Reward Failed", e);
                resolve(null);
                this.prepareRewardVideo();
            }
        });
    }
}

export const adMobService = AdMobService.getInstance();
