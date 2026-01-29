import { useState, useEffect } from "react";
import { useUserCredits } from "@/hooks/useUserCredits";
import { Coins, Gift, Zap, Video, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentUser } from "@/data/mockData";
import { auth, supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function GetCreditsPage() {
    const [lastClaim, setLastClaim] = useState<string | null>(null);
    const { credits, isLoading: creditsLoading, invalidateCredits } = useUserCredits();

    // Ad Reward Logic
    const [isWatchingAd, setIsWatchingAd] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);

    const fetchUserData = async () => {
        const user = await auth.getCurrentUser();
        if (!user) return;

        const { data } = await supabase.from('profiles').select('last_bonus_date').eq('id', user.id).single();
        if (data) {
            setLastClaim(data.last_bonus_date);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isWatchingAd && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (isWatchingAd && timeLeft === 0) {
            completeAd();
        }
        return () => clearInterval(timer);
    }, [isWatchingAd, timeLeft]);

    const handleClaimBonus = async () => {
        const { data: result, error } = await supabase.rpc('claim_daily_bonus');

        if (result && result.success) {
            toast.success(`Tebrikler! ${result.new_credits} Kredi hesabınıza eklendi.`);
            invalidateCredits(); // Global state update
            fetchUserData(); // Update last claim time locally
        } else if (result && !result.success) {
            // Parse existing error message or use result
            toast.error(result.message || "Henüz vaktiniz dolmadı, daha sonra tekrar deneyin.");
        } else {
            console.error("Bonus error:", error);
            toast.error("Hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    const startAd = () => {
        alert("Reklam yakında burada olacak!");
        // Future implementation:
        // setIsWatchingAd(true);
        // setTimeLeft(15);
        // toast.info("Reklam başladı! Kapatma...");
    };

    const completeAd = async () => {
        setIsWatchingAd(false);
        const { data, error } = await supabase.rpc('reward_ad_credits');
        if (!error) {
            toast.success("Tebrikler! +2 Kredi kazandın! 🎉");
            fetchUserData(); // Refresh credits
        } else {
            toast.error("Ödül verilirken hata oluştu.");
        }
    };

    const isClaimable = () => {
        if (!lastClaim) return true;
        const last = new Date(lastClaim).getTime();
        const now = new Date().getTime();
        return (now - last) > 24 * 60 * 60 * 1000;
    };

    return (
        <div className="min-h-screen bg-background pb-28 relative p-4">
            {/* Header */}
            <header className="mb-6 flex items-center justify-between">
                <h1 className="text-2xl font-black gradient-text">Kredi Kazan</h1>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 bg-secondary/10">
                    <Coins className="w-4 h-4 text-secondary" />
                    <span className="font-bold text-secondary">
                        {creditsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : credits}
                    </span>
                </div>
            </header>

            <div className="space-y-4">
                {/* Daily Bonus Card */}
                <div className="relative overflow-hidden rounded-3xl p-6 glass-card border border-primary/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />

                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center glow-violet">
                            <Gift className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Günlük Bonus</h3>
                            <p className="text-sm text-muted-foreground">Her gün 3 kredi kazan</p>
                        </div>
                    </div>

                    <Button
                        onClick={handleClaimBonus}
                        disabled={!isClaimable() || creditsLoading}
                        className="w-full h-12 rounded-xl gradient-primary font-bold text-lg"
                    >
                        {creditsLoading ? "Yükleniyor..." : isClaimable() ? "Günlük Bonus Al (10 Kredi)" : "Yarın Gel"}
                    </Button>
                </div>

                {/* Watch Ad Card */}
                <div className="rounded-3xl p-6 glass-card border border-border/30 relative overflow-hidden">
                    {isWatchingAd && (
                        <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center text-center p-4">
                            <Video className="w-12 h-12 text-white animate-bounce mb-4" />
                            <h3 className="text-white font-bold text-xl mb-2">Reklam İzleniyor...</h3>
                            <p className="text-white/60 mb-4">Lütfen bekleyin</p>
                            <div className="text-4xl font-black text-primary">{timeLeft}s</div>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                                <Video className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold">Reklam İzle</h3>
                                <p className="text-xs text-muted-foreground">+2 Kredi</p>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={startAd} disabled={isWatchingAd}>
                            İzle
                        </Button>
                    </div>
                </div>

                {/* Buy Credits */}
                <div className="rounded-3xl p-6 glass-card border border-border/30">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Coins className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h3 className="font-bold">Kredi Paketi Al</h3>
                            <p className="text-xs text-muted-foreground">En popüler seçenek</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => toast.success("Satın alma başarılı (Demo)")}>
                            100 Kredi - ₺29.99
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
