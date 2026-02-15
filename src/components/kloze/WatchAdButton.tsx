import { useState, useEffect } from "react";
import { Play, Gift, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { adMobService } from "@/services/adMobService";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getSetting } from "@/services/appSettingsService";

// Simple signed guest credits to prevent localStorage manipulation
const GUEST_CREDIT_KEY = 'guest_credits';
const GUEST_CREDIT_SIG = 'guest_credits_sig';
const SALT = 'kloze_2024_gc';

function signCredits(amount: number): string {
  // Simple hash - not cryptographically secure but prevents casual tampering
  const raw = `${SALT}_${amount}_${SALT}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

export function getGuestCredits(): number {
  const stored = localStorage.getItem(GUEST_CREDIT_KEY);
  const sig = localStorage.getItem(GUEST_CREDIT_SIG);
  if (!stored) return 0;
  const amount = parseInt(stored);
  if (isNaN(amount) || amount < 0) return 0;
  // Verify signature
  if (sig !== signCredits(amount)) return 0;
  return amount;
}

export function setGuestCredits(amount: number) {
  localStorage.setItem(GUEST_CREDIT_KEY, amount.toString());
  localStorage.setItem(GUEST_CREDIT_SIG, signCredits(amount));
}

interface WatchAdButtonProps {
  onCreditEarned?: () => void;
  className?: string;
}

export function WatchAdButton({ onCreditEarned, className }: WatchAdButtonProps) {
  const [watchingAd, setWatchingAd] = useState(false);
  const [adCooldown, setAdCooldown] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(1);

  useEffect(() => {
    getSetting('credit_reward_per_ad').then(amt => {
      // If setting exists, use it. Default is 1 in service, but check again.
      if (typeof amt === 'number') setRewardAmount(amt);
    });
  }, []);

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
            amount: rewardAmount
          });

          if (error) {
            console.error("Credit add error:", error);
            toast.error("Kredi eklenemedi, tekrar dene");
          } else {
            toast.success(`+${rewardAmount} Kredi kazandın! 🎬`, {
              icon: <Gift className="w-5 h-5 text-green-500" />,
              description: `${rewardAmount} sticker paketi indirebilirsin`
            });
            startCooldown();
            onCreditEarned?.();
          }
        } else {
          // GUEST USER: Save with signature verification
          const currentCredits = getGuestCredits();
          const newCredits = currentCredits + rewardAmount;
          setGuestCredits(newCredits);

          toast.success(`+${rewardAmount} Kredi kazandın! 🎬`, {
            icon: <Gift className="w-5 h-5 text-green-500" />,
            description: `${rewardAmount} sticker paketi indirebilirsin. Giriş yapınca hesabına aktarılır.`,
          });
          startCooldown();
          window.dispatchEvent(new Event('guest-credits-updated'));
          onCreditEarned?.();
        }
      } else {
        // Ad was not shown or dismissed without reward
        toast.info("Reklam tamamlanmadı, tekrar deneyin");
      }
    } catch (e) {
      console.error("Ad error:", e);
      toast.error("Reklam yüklenemedi, tekrar dene");
    } finally {
      setWatchingAd(false);
    }
  };

  const startCooldown = () => {
    setAdCooldown(true);
    setTimeout(() => setAdCooldown(false), 30000);
  };
  return (
    <button
      onClick={handleWatchAd}
      disabled={watchingAd || adCooldown}
      className={cn(
        "relative flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "bg-gradient-to-r from-emerald-500/20 to-green-500/20",
        "border border-emerald-500/40",
        "hover:from-emerald-500/30 hover:to-green-500/30",
        "transition-all duration-300",
        "group overflow-hidden",
        (watchingAd || adCooldown) && "opacity-60 cursor-not-allowed",
        !watchingAd && !adCooldown && "hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/20",
        className
      )}
    >
      {/* Animated shine effect */}
      {!watchingAd && !adCooldown && (
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}

      {/* Pulse ring effect when idle */}
      {!watchingAd && !adCooldown && (
        <div className="absolute inset-0 rounded-full animate-ping bg-emerald-500/20 opacity-75" style={{ animationDuration: '2s' }} />
      )}

      {/* Icon */}
      <div className="relative z-10">
        {watchingAd ? (
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
        ) : adCooldown ? (
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        ) : (
          <Play className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        )}
      </div>

      {/* Text */}
      <span className="relative z-10 text-xs font-bold text-emerald-300 whitespace-nowrap">
        {watchingAd ? "..." : adCooldown ? "OK!" : `+${rewardAmount}`}
      </span>

      {/* Gift icon for extra appeal */}
      {!watchingAd && !adCooldown && (
        <Gift className="relative z-10 w-3 h-3 text-emerald-400 group-hover:animate-bounce" />
      )}
    </button>
  );
}
