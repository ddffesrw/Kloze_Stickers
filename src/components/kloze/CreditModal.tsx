import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins, Play, ShoppingCart, Crown, Sparkles, Gift, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { adMobService } from "@/services/adMobService";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface CreditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCredits: number;
  isPro?: boolean;
}

export function CreditModal({ open, onOpenChange, currentCredits, isPro = false }: CreditModalProps) {
  const navigate = useNavigate();
  const [watchingAd, setWatchingAd] = useState(false);
  const [adCooldown, setAdCooldown] = useState(false);

  const handleWatchAd = async () => {
    if (watchingAd || adCooldown) return;

    setWatchingAd(true);
    try {
      const reward = await adMobService.showRewardVideo();

      if (reward) {
        // Kredi ekle
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.rpc('add_credits', {
            user_id: user.id,
            amount: 1
          });

          if (!error) {
            toast.success("+1 Kredi kazandın!", {
              icon: <Gift className="w-5 h-5 text-green-500" />,
            });
            // Cooldown başlat (30 saniye)
            setAdCooldown(true);
            setTimeout(() => setAdCooldown(false), 30000);
          }
        }
      }
    } catch (e) {
      console.error("Ad error:", e);
      toast.error("Reklam yüklenemedi, tekrar dene");
    } finally {
      setWatchingAd(false);
    }
  };

  const handleBuyCredits = () => {
    onOpenChange(false);
    navigate("/credits");
  };

  const handleGoPro = () => {
    onOpenChange(false);
    navigate("/credits");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-zinc-950/95 backdrop-blur-xl border-zinc-800/50 text-white p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
          <DialogHeader className="relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Coins className="w-6 h-6 text-white" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl font-black">
              {isPro ? (
                <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  PRO Üyelik
                </span>
              ) : (
                <>
                  <span className="text-white">Kredilerin: </span>
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                    {currentCredits}
                  </span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-3">
          {/* Pro Badge */}
          {isPro && (
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">Sınırsız üretim hakkın var!</span>
            </div>
          )}

          {/* Watch Ad Button */}
          {!isPro && (
            <button
              onClick={handleWatchAd}
              disabled={watchingAd || adCooldown}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl",
                "bg-gradient-to-r from-emerald-500/10 to-green-500/10",
                "border border-emerald-500/30",
                "hover:from-emerald-500/20 hover:to-green-500/20",
                "transition-all duration-300",
                "group",
                (watchingAd || adCooldown) && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                {watchingAd ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : adCooldown ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-white">
                  {watchingAd ? "Reklam izleniyor..." : adCooldown ? "Tamamlandı!" : "Reklam İzle"}
                </p>
                <p className="text-xs text-zinc-400">
                  {adCooldown ? "30 saniye bekle" : "Ücretsiz +1 kredi kazan"}
                </p>
              </div>
              {!watchingAd && !adCooldown && (
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <span className="text-xs font-bold text-emerald-400">+1</span>
                </div>
              )}
            </button>
          )}

          {/* Buy Credits Button */}
          <button
            onClick={handleBuyCredits}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl",
              "bg-gradient-to-r from-violet-500/10 to-purple-500/10",
              "border border-violet-500/30",
              "hover:from-violet-500/20 hover:to-purple-500/20",
              "transition-all duration-300",
              "group"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-bold text-white">Kredi Satın Al</p>
              <p className="text-xs text-zinc-400">Paketleri görüntüle</p>
            </div>
            <Sparkles className="w-5 h-5 text-violet-400 group-hover:animate-pulse" />
          </button>

          {/* Go Pro Button */}
          {!isPro && (
            <button
              onClick={handleGoPro}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl",
                "bg-gradient-to-r from-amber-500/20 to-yellow-500/20",
                "border border-amber-500/40",
                "hover:from-amber-500/30 hover:to-yellow-500/30",
                "transition-all duration-300",
                "group relative overflow-hidden"
              )}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                  PRO'ya Geç
                </p>
                <p className="text-xs text-zinc-400">Sınırsız üretim + Reklamsız</p>
              </div>
              <div className="px-2 py-1 rounded-full bg-amber-500/30">
                <span className="text-[10px] font-bold text-amber-300">POPÜLER</span>
              </div>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
