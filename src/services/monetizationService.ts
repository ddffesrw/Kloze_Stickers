import { Purchases, PurchasesPackage, CustomerInfo, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

const REVENUECAT_API_KEY = "app30abbfe35b";

export interface ProStatus {
    isPro: boolean;
    activeEntitlements: string[];
}

class MonetizationService {
    private static instance: MonetizationService;
    private isInitialized = false;

    private constructor() { }

    public static getInstance(): MonetizationService {
        if (!MonetizationService.instance) {
            MonetizationService.instance = new MonetizationService();
        }
        return MonetizationService.instance;
    }

    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        if (Capacitor.isNativePlatform()) {
            try {
                await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });

                // Configure with the provided key
                // Note: In production you usually separate iOS and Android keys.
                // For now using the single provided key.
                await Purchases.configure({ apiKey: REVENUECAT_API_KEY });

                this.isInitialized = true;
                console.log('RevenueCat initialized');

                // Check legacy status on init
                await this.checkProStatus();

            } catch (error) {
                console.error('RevenueCat init failed:', error);
            }
        } else {
            console.log('RevenueCat skipped (Web Platform)');
        }
    }

    public async getOfferings(): Promise<PurchasesPackage[]> {
        if (!this.isInitialized) return [];

        try {
            const offerings = await Purchases.getOfferings();
            if (offerings.current && offerings.current.availablePackages.length > 0) {
                return offerings.current.availablePackages;
            }
        } catch (error) {
            console.error('Error fetching offerings:', error);
        }
        return [];
    }

    public async purchasePackage(pack: PurchasesPackage): Promise<boolean> {
        try {
            const { customerInfo } = await Purchases.purchasePackage({ aPackage: pack });
            return this.handleCustomerInfo(customerInfo);
        } catch (error: any) {
            if (error.userCancelled) {
                toast.info("Satın alma iptal edildi.");
            } else {
                console.error("Purchase error:", error);
                toast.error("Satın alma başarısız: " + error.message);
            }
            return false;
        }
    }

    public async restorePurchases(): Promise<boolean> {
        try {
            const { customerInfo } = await Purchases.restorePurchases();
            const success = this.handleCustomerInfo(customerInfo);
            if (success) toast.success("Satın alımlar geri yüklendi!");
            else toast.info("Aktif üyelik bulunamadı.");
            return success;
        } catch (error: any) {
            toast.error("Geri yükleme hatası: " + error.message);
            return false;
        }
    }

    public async checkProStatus(): Promise<boolean> {
        if (!this.isInitialized) return false;

        try {
            const { customerInfo } = await Purchases.getCustomerInfo();
            return this.handleCustomerInfo(customerInfo);
        } catch (error) {
            console.error("Check status error:", error);
            return false;
        }
    }

    private handleCustomerInfo(info: CustomerInfo): boolean {
        const isPro = typeof info.entitlements.active['pro'] !== "undefined"; // Assuming 'pro' is the entitlement identifier in RC

        if (isPro) {
            // Update Supabase User Metadata to reflect Pro status seamlessly
            this.updateUserStatus(true);
        }

        return isPro;
    }

    private async updateUserStatus(isPro: boolean) {
        // This syncs the local purchase state with our DB
        // We can use an Edge Function webhook for security, but client-side sync is okay for MVP
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Update a 'is_pro' column in users table or metadata
            await supabase.from('users').update({ is_pro: isPro }).eq('id', user.id);
        }
    }
}

export const monetizationService = MonetizationService.getInstance();
