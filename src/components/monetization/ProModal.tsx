
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { monetizationService } from "@/services/monetizationService";
import { adMobService } from "@/services/adMobService";
import { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { toast } from "sonner";

interface ProModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProModal({ open, onOpenChange }: ProModalProps) {
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);

    useEffect(() => {
        if (open) {
            loadOfferings();
        }
    }, [open]);

    const loadOfferings = async () => {
        const offerPackages = await monetizationService.getOfferings();
        // Filter out consumables if mixed (assuming monthly/annual are for Pro)
        const subs = offerPackages.filter(p => !p.product.identifier.includes("credit"));
        setPackages(subs);
    };

    const handlePurchase = async (pack: PurchasesPackage) => {
        setLoading(true);
        const success = await monetizationService.purchasePackage(pack);
        if (success) {
            toast.success("Tebrikler! Artık PRO üyesisin. 🎉");
            adMobService.updateProStatus(true);
            onOpenChange(false);
        }
        setLoading(false);
    };

    const handleRestore = async () => {
        setLoading(true);
        const success = await monetizationService.restorePurchases();
        if (success) {
            adMobService.updateProStatus(true);
            onOpenChange(false);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                        <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                    <DialogTitle className="text-center text-2xl font-black bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
                        Kloze PRO'ya Geç
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-400">
                        Sınırsız yaratıcılık için limitleri kaldırın.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <FeatureItem text="Reklamları Kaldır" />
                    <FeatureItem text="Sınırsız Sticker Üretimi" />
                    <FeatureItem text="Öncelikli Hızlı Sunucu" />
                    <FeatureItem text="Premium Paketlere Erişim" />
                </div>

                <div className="space-y-3">
                    {packages.length === 0 ? (
                        <div className="text-center text-sm text-zinc-500 py-4">paketler yükleniyor...</div>
                    ) : (
                        packages.map(pack => (
                            <Button
                                key={pack.identifier}
                                onClick={() => handlePurchase(pack)}
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-bold h-12 rounded-xl"
                            >
                                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {pack.product.title} - {pack.product.priceString}
                            </Button>
                        ))
                    )}

                    <Button
                        variant="ghost"
                        onClick={handleRestore}
                        disabled={loading}
                        className="w-full text-zinc-400 hover:text-white"
                    >
                        Satın Alımları Geri Yükle
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function FeatureItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-green-500" />
            </div>
            <span className="font-medium text-zinc-200">{text}</span>
        </div>
    );
}
