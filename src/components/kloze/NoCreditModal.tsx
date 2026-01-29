import { Crown, Play, Coins, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { AdMob, RewardAdPluginEvents, AdMobRewardItem } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface NoCreditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreditsEarned?: () => void;
    requiredCredits?: number;
    featureName?: string;
}

export function NoCreditModal({
    isOpen,
    onClose,
    onCreditsEarned,
    requiredCredits = 1,
    featureName = "Bu özellik"
}: NoCreditModalProps) {
    const navigate = useNavigate();
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    const handleWatchAd = async () => {
        if (!Capacitor.isNativePlatform()) {
            toast.error("Reklamlar sadece mobil uygulamada çalışır");
            return;
        }

        setIsWatchingAd(true);

        try {
            // Prepare reward ad
            await AdMob.prepareRewardVideoAd({
                adId: 'ca-app-pub-3940256099942544/5224354917' // Test ID
            });

            // Listen for reward
            const rewardListener = await AdMob.addListener(
                RewardAdPluginEvents.Rewarded,
                async (reward: AdMobRewardItem) => {
                    console.log('Reward received:', reward);

                    // Add credit via RPC
                    await supabase.rpc('add_credits', { amount: 1 });

                    toast.success("🎉 1 Kredi kazandın!");
                    onCreditsEarned?.();
                    onClose();
                }
            );

            // Show ad
            await AdMob.showRewardVideoAd();

            // Cleanup listener after ad closes
            setTimeout(() => rewardListener.remove(), 5000);

        } catch (error) {
            console.error('Ad error:', error);
            toast.error("Reklam yüklenemedi. Daha sonra tekrar deneyin.");
        } finally {
            setIsWatchingAd(false);
        }
    };

    const handleGoPro = () => {
        onClose();
        navigate('/credits');
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="glass-card gradient-dark border-white/10 max-w-sm">
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 rounded-lg bg-white/10 hover:bg-white/20"
                >
                    <X className="w-4 h-4" />
                </button>

                <AlertDialogHeader className="text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
                        <Coins className="w-8 h-8 text-yellow-500" />
                    </div>
                    <AlertDialogTitle className="text-xl font-bold text-white">
                        Kredi Gerekli
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                        {featureName} için {requiredCredits} kredi gerekli.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 mt-4">
                    {/* Watch Ad Option */}
                    <button
                        onClick={handleWatchAd}
                        disabled={isWatchingAd}
                        className="w-full p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all flex items-center gap-4"
                    >
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            {isWatchingAd ? (
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : (
                                <Play className="w-6 h-6 text-blue-500" />
                            )}
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-bold text-white text-sm">Reklam İzle</p>
                            <p className="text-[11px] text-white/50">30 saniye izle, 1 kredi kazan</p>
                        </div>
                        <span className="text-blue-400 font-bold text-sm">+1</span>
                    </button>

                    {/* Go Pro Option */}
                    <button
                        onClick={handleGoPro}
                        className="w-full p-4 rounded-2xl border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-all flex items-center gap-4"
                    >
                        <div className="w-12 h-12 rounded-xl gradient-gold flex items-center justify-center flex-shrink-0">
                            <Crown className="w-6 h-6 text-amber-900" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-bold text-white text-sm">Pro Ol</p>
                            <p className="text-[11px] text-white/50">Sınırsız kredi + arka plan silme</p>
                        </div>
                        <span className="text-primary font-bold text-sm">→</span>
                    </button>
                </div>

                {/* Skip option */}
                <button
                    onClick={onClose}
                    className="mt-4 w-full text-center text-xs text-white/40 hover:text-white/60"
                >
                    Daha sonra
                </button>
            </AlertDialogContent>
        </AlertDialog>
    );
}
