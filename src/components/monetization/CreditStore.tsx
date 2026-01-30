
import { useEffect, useState } from "react";
import { monetizationService } from "@/services/monetizationService";
import { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { adMobService } from "@/services/adMobService";

export function CreditStore() {
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCredits();
    }, []);

    const loadCredits = async () => {
        const allPackages = await monetizationService.getOfferings();
        // Assuming your credit packs contain "credit" or "coin" in identifier
        const credits = allPackages.filter(p =>
            p.product.identifier.toLowerCase().includes("credit") ||
            p.product.identifier.toLowerCase().includes("coin")
        );
        setPackages(credits);
    };

    const handlePurchase = async (pack: PurchasesPackage) => {
        setLoading(true);
        const success = await monetizationService.purchasePackage(pack);
        setLoading(false);
    };

    const handleWatchAd = async () => {
        setLoading(true);
        const reward = await adMobService.showRewardVideo();
        if (reward) {
            toast.success("2 Kredi kazandınız! (Simülasyon)");
            // TODO: Call backend to add 2 credits for real
            // Currently adMobService handles the ad show, but we need to implement the credit add logic for rewards separately if not handled automatically.
            // For now just show toast.
        } else {
            toast.info("Reklam izlenmedi veya kapandı.");
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-yellow-400" />
                Kredi Yükle
            </h2>

            <div className="grid grid-cols-2 gap-4">
                {/* Free Ad Reward */}
                <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="font-bold text-white">Ücretsiz</p>
                        <p className="text-xs text-zinc-400">Reklam İzle</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleWatchAd} disabled={loading} className="w-full">
                        +2 Kredi
                    </Button>
                </div>

                {packages.length === 0 && (
                    <div className="col-span-2 text-center text-zinc-500 py-8">
                        Kredi paketleri yükleniyor...
                        <br /><span className="text-xs opacity-50">(RevenueCat panelinden 'credits_100' vb. ürünleri ekleyin)</span>
                    </div>
                )}

                {packages.map(pack => (
                    <div key={pack.identifier} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3 text-center relative overflow-hidden group">
                        <div className="absolute inset-0 bg-yellow-500/5 group-hover:bg-yellow-500/10 transition-colors" />
                        <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center z-10">
                            <Coins className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="z-10">
                            <p className="font-bold text-white text-lg">{pack.product.title}</p>
                            <p className="text-sm text-zinc-400">{pack.product.description}</p>
                        </div>
                        <Button
                            onClick={() => handlePurchase(pack)}
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-zinc-200 z-10"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : pack.product.priceString}
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
