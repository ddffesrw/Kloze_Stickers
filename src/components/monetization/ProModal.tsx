
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { monetizationService } from "@/services/monetizationService";
import { PurchasesPackage } from "@revenuecat/purchases-capacitor";
import { toast } from "sonner";

interface ProModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function ProModal({ open, onOpenChange, onSuccess }: ProModalProps) {
    const [loading, setLoading] = useState(false);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);

    useEffect(() => {
        if (open) {
            loadOfferings();
        }
    }, [open]);

    const loadOfferings = async () => {
        try {
            const offerPackages = await monetizationService.getOfferings();
            // Filter out consumables if mixed (assuming monthly/annual are for Pro)
            // Ideally check package identifier or type
            const subs = offerPackages.filter(p => !p.product.identifier.includes("credit"));
            setPackages(subs);
        } catch (e) {
            console.error("Failed to load offerings", e);
        }
    };

    const handlePurchase = async (pack: PurchasesPackage) => {
        setLoading(true);
        try {
            const success = await monetizationService.purchasePackage(pack);
            if (success) {
                toast.success("Tebrikler! Artık PRO üyesisin. 🎉");
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.error("Satın alma tamamlanamadı. Lütfen tekrar deneyin.");
            }
        } catch (error: any) {
            console.error('Purchase error:', error);
            if (!error.userCancelled) {
                toast.error(error?.message || "Satın alma sırasında bir hata oluştu.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        try {
            const success = await monetizationService.restorePurchases();
            if (success) {
                toast.success("Satın alımlar geri yüklendi!");
                onOpenChange(false);
                onSuccess?.();
            } else {
                toast.info("Geri yüklenecek aktif abonelik bulunamadı.");
            }
        } catch (error: any) {
            console.error('Restore error:', error);
            toast.error(error?.message || "Geri yükleme sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-black/90 backdrop-blur-xl border border-white/10 text-white shadow-2xl">
                <DialogHeader>
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400/20 to-amber-600/20 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-yellow-500/30 shadow-[0_0_30px_-5px_rgba(234,179,8,0.3)]">
                        <Crown className="w-8 h-8 text-yellow-400 drop-shadow-md" />
                    </div>
                    <DialogTitle className="text-center text-3xl font-black bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent">
                        Kloze PRO
                    </DialogTitle>
                    <DialogDescription className="text-center text-zinc-400 text-base">
                        Sıradaşı özelliklerin kilidini açın.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-6 px-2 bg-white/5 rounded-2xl border border-white/5">
                    <FeatureItem text="Reklamları Kaldır" />
                    <FeatureItem text="Sınırsız Sticker Üretimi" />
                    <FeatureItem text="Hızlı Sunucu Önceliği" />
                    <FeatureItem text="Premium Paketlere Erişim" />
                </div>

                <div className="space-y-3 pt-2">
                    {packages.length === 0 ? (
                        <div className="text-center text-sm text-zinc-500 py-4 flex flex-col items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Paketler yükleniyor...</span>
                        </div>
                    ) : (
                        packages.map(pack => {
                            const isYearly = pack.product.identifier.toLowerCase().includes('year') ||
                                           pack.product.identifier.toLowerCase().includes('annual');
                            const displayName = isYearly ? 'Yıllık PRO' : 'Aylık PRO';

                            return (
                                <Button
                                    key={pack.identifier}
                                    onClick={() => handlePurchase(pack)}
                                    disabled={loading}
                                    className="w-full relative overflow-hidden bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-bold h-14 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center gap-2 text-lg">
                                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                                        {displayName}
                                        <span className="opacity-80 text-sm font-normal">({pack.product.priceString})</span>
                                    </span>
                                </Button>
                            );
                        })
                    )}

                    <Button
                        variant="ghost"
                        onClick={handleRestore}
                        disabled={loading}
                        className="w-full text-zinc-500 hover:text-white hover:bg-white/5 h-10"
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
