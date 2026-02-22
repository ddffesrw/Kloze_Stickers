import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
    Loader2, Crown, Star, Check, ArrowLeft, Percent, ShieldCheck, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth, supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { monetizationService } from "@/services/monetizationService";
import { PurchasesPackage } from "@revenuecat/purchases-capacitor";

export default function GetCreditsPage() {
    const [isPro, setIsPro] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [purchasing, setPurchasing] = useState<string | null>(null);

    // Fetch user data and RevenueCat offerings
    useEffect(() => {
        const init = async () => {
            // User data
            const user = await auth.getCurrentUser();
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('is_pro')
                    .eq('id', user.id)
                    .single();

                if (data) {
                    setIsPro(data.is_pro || false);
                }
            }

            // Load RevenueCat offerings (country-based pricing)
            try {
                const offerPackages = await monetizationService.getOfferings();
                // Filter for subscription packages only (exclude credits)
                const subscriptions = offerPackages.filter(p => !p.product.identifier.includes("credit"));
                setPackages(subscriptions);
            } catch (e) {
                console.error("Error loading offerings:", e);
            } finally {
                setLoadingPlans(false);
            }
        };

        init();
    }, []);

    const handlePurchase = async (pack: PurchasesPackage) => {
        setPurchasing(pack.identifier);

        try {
            const success = await monetizationService.purchasePackage(pack);
            if (success) {
                setIsPro(true);
                toast.success("Tebrikler! Artık PRO üyesin! 🎉👑");
            }
        } catch (e: any) {
            if (e?.userCancelled) {
                toast.info("Satın alma iptal edildi.");
            } else {
                console.error("Purchase error:", e);
                toast.error("Satın alma başarısız: " + (e?.message || "Bilinmeyen hata"));
            }
        } finally {
            setPurchasing(null);
        }
    };

    // Helper to determine if package is yearly/annual
    const isYearlyPackage = (pack: PurchasesPackage): boolean => {
        const identifier = pack.product.identifier.toLowerCase();
        return identifier.includes('year') || identifier.includes('annual');
    };

    // Helper to get best value package (usually annual)
    const getBestValuePackage = (): PurchasesPackage | null => {
        return packages.find(p => isYearlyPackage(p)) || null;
    };

    return (
        <div className="min-h-screen bg-background pb-10 relative overflow-hidden">
            {/* Background */}
            <div className="fixed inset-0 mesh-gradient opacity-40 pointer-events-none" />

            {/* Ambient Blobs */}
            <div className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-40">
                <div className="flex items-center p-4">
                    <Link to="/profile" className="p-2 rounded-xl bg-background/50 backdrop-blur-md border border-border/20 hover:bg-muted/50 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                </div>
            </header>

            <main className="relative z-10 px-6 space-y-8 max-w-lg mx-auto">
                {/* Hero Section */}
                <div className="text-center space-y-4 pt-4">
                    <div className="inline-flex relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 blur-2xl opacity-40 animate-pulse" />
                        <div className="relative w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center glow-gold shadow-2xl">
                            <Crown className="w-12 h-12 text-white drop-shadow-md" />
                        </div>
                        <div className="absolute -top-2 -right-2">
                            <Sparkles className="w-8 h-8 text-yellow-200 animate-bounce" />
                        </div>
                    </div>

                    <div>
                        <h1 className="text-4xl font-black mb-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 drop-shadow-sm">
                            Kloze PRO
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg">
                            Yaratıcılığının sınırlarını kaldır.
                        </p>
                    </div>
                </div>

                {/* Benefits List */}
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-400">
                            <Star className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <span className="text-muted-foreground line-through text-sm">150</span>
                                <span className="text-amber-400">Her Ay 300 Kredi</span>
                            </h3>
                            <p className="text-sm text-muted-foreground">Premium motorlarda (DALL-E) kullan</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Filigransız Çıktı</h3>
                            <p className="text-sm text-muted-foreground">Stickerlarda reklam logosu olmaz</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                            <Percent className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Sınırsız Paket İndirme</h3>
                            <p className="text-sm text-muted-foreground">WhatsApp'a dilediğin kadar paket aktar</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="p-2.5 rounded-xl bg-green-500/20 text-green-400">
                            <Check className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Reklamsız Deneyim</h3>
                            <p className="text-sm text-muted-foreground">Kesintisiz ve hızlı sticker üretimi</p>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loadingPlans && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Plans */}
                {!loadingPlans && (
                    <div className="space-y-4">
                        {packages.map((pack) => {
                            const isYearly = isYearlyPackage(pack);
                            const bestValue = getBestValuePackage();
                            const isBestValue = bestValue?.identifier === pack.identifier;

                            return (
                                <div
                                    key={pack.identifier}
                                    className={cn(
                                        "relative overflow-hidden rounded-3xl p-1 transition-all duration-300 hover:scale-[1.02]",
                                        isBestValue
                                            ? "bg-gradient-to-r from-amber-400 to-orange-500 shadow-xl shadow-orange-500/20"
                                            : "bg-border/50"
                                    )}
                                >
                                    <div className="bg-background/95 backdrop-blur-xl rounded-[22px] p-5 h-full relative">
                                        {/* Best Value Badge */}
                                        {isBestValue && (
                                            <div className="absolute -top-0.5 -right-0.5 px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold rounded-bl-2xl">
                                                🏆 EN POPÜLER
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-xl font-black">
                                                    {isYearly ? 'Yıllık PRO' : 'Aylık PRO'}
                                                </h3>
                                                {isYearly && (
                                                    <div className="inline-block mt-1 px-2 py-0.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold">
                                                        En Avantajlı
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-baseline gap-1 justify-end">
                                                    <span className="text-2xl font-black">
                                                        {pack.product.priceString}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {isYearly ? 'yıllık' : 'aylık'}
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handlePurchase(pack)}
                                            disabled={purchasing === pack.identifier || isPro}
                                            className={cn(
                                                "w-full h-14 rounded-xl font-bold text-lg shadow-lg transition-all",
                                                isBestValue
                                                    ? "bg-gradient-to-r from-amber-400 to-orange-500 text-black hover:brightness-110 shadow-orange-500/20"
                                                    : "bg-secondary/10 text-secondary hover:bg-secondary/20"
                                            )}
                                        >
                                            {purchasing === pack.identifier ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : isPro ? (
                                                "Zaten Üyesin ✓"
                                            ) : (
                                                isYearly ? "Yıllık Başlat" : "Aylık Başlat"
                                            )}
                                        </Button>

                                        {pack.product.introPrice && (
                                            <p className="text-center text-xs text-muted-foreground mt-3">
                                                {pack.product.introPrice.periodNumberOfUnits} {pack.product.introPrice.periodUnit === 'DAY' ? 'gün' : 'ay'} ücretsiz deneme
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Footer Actions */}
                <div className="space-y-4 pt-4 pb-8">
                    <button
                        onClick={async () => {
                            const success = await monetizationService.restorePurchases();
                            if (success) {
                                toast.success("Satın alımlar geri yüklendi!");
                                setIsPro(true);
                            }
                        }}
                        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
                    >
                        Satın Alımları Geri Yükle
                    </button>

                    <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Google Play ile güvenli ödeme</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
