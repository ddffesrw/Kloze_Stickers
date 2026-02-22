import { useState, useEffect } from "react";
import { Gift, Flame, Calendar, Coins, Sparkles, Play, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { checkDailyBonus, claimDailyBonus, getStreakInfo, type DailyBonusResult } from "@/services/dailyBonusService";
import { toast } from "sonner";

import { adMobService } from "@/services/adMobService";
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface DailyBonusModalProps {
  userId: string;
  onClaim?: (credits: number) => void;
}

export function DailyBonusModal({ userId, onClaim }: DailyBonusModalProps) {
  const [open, setOpen] = useState(false);
  const [bonusInfo, setBonusInfo] = useState<DailyBonusResult | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [earnedCredits, setEarnedCredits] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adWatched, setAdWatched] = useState(false);
  const { credits, setCreditsLocal } = useAuth();

  useEffect(() => {
    if (!userId) return;

    const checkBonus = async () => {
      const result = await checkDailyBonus(userId);
      setBonusInfo(result);

      if (result.canClaim) {
        setTimeout(() => setOpen(true), 1000);
      }
    };

    checkBonus();
  }, [userId]);

  const handleClaim = async () => {
    if (!userId || isClaiming) return;
    setIsClaiming(true);

    try {
      // Pass cached bonusInfo to skip redundant DB query
      const result = await claimDailyBonus(userId, bonusInfo || undefined);

      if (result.success) {
        setClaimed(true);
        setEarnedCredits(result.creditsEarned);
        // Lokal güncelle — refreshAuthCredits gereksiz DB çağrısı yapar, sadece lokal set yeterli
        setCreditsLocal(credits + result.creditsEarned);

        toast.success(`+${result.creditsEarned} kredi kazandın! 🎉`);
        onClaim?.(result.creditsEarned);
      } else {
        toast.error("Bonus alınamadı, daha sonra tekrar dene");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    } finally {
      setIsClaiming(false);
    }
  };

  // Reklam izle → x2 bonus (günlük bonus kadar ekstra kredi)
  const handleWatchAd = async () => {
    if (!userId || isWatchingAd || adWatched) return;
    setIsWatchingAd(true);

    try {
      const reward = await adMobService.showRewardVideo();

      if (reward) {
        const extraCredits = bonusInfo?.bonusAmount || 1;
        const { error } = await supabase.rpc('add_credits', {
          user_id: userId,
          amount: extraCredits
        });

        if (!error) {
          setAdWatched(true);
          setEarnedCredits(prev => prev + extraCredits);
          // Lokal güncelle — refreshAuthCredits gereksiz DB çağrısı yapar
          setCreditsLocal(credits + extraCredits);

          toast.success(`+${extraCredits} bonus kredi kazandın! 🎬`);
          onClaim?.(extraCredits);
        } else {
          toast.error("Kredi eklenemedi");
        }
      } else {
        toast.error("Reklam tamamlanamadı");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    } finally {
      setIsWatchingAd(false);
    }
  };

  if (!bonusInfo) return null;

  const streakInfo = getStreakInfo(bonusInfo.streakDays);
  const nextStreak = bonusInfo.streakDays + 1;
  const nextStreakInfo = getStreakInfo(nextStreak);

  const getTimeUntilNext = () => {
    if (!bonusInfo.nextClaimTime) return null;
    const now = new Date();
    const diff = bonusInfo.nextClaimTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}s ${minutes}dk`;
  };

  const days = [1, 2, 3, 4, 5, 6, 7];
  const currentStreak = claimed ? nextStreak : bonusInfo.streakDays;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (claimed || !bonusInfo.canClaim) setOpen(v); }}>
      <DialogContent className="glass-card gradient-dark border-white/10 w-[90vw] max-w-[340px] p-0 overflow-hidden max-h-[85vh]">
        {/* Compact Header */}
        <div className="relative bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20 px-5 pt-5 pb-4">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-yellow-500/10 blur-3xl" />
          </div>

          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  {claimed ? (
                    <Sparkles className="w-7 h-7 text-white" />
                  ) : (
                    <Gift className="w-7 h-7 text-white" />
                  )}
                </div>
                {bonusInfo.streakDays > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] font-bold border-2 border-background">
                    {bonusInfo.streakDays}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-black text-foreground text-left">
                  {claimed ? "Tebrikler! 🎉" : "Günlük Bonus!"}
                </DialogTitle>
                <p className="text-muted-foreground text-xs mt-0.5">
                  {claimed
                    ? `+${earnedCredits} kredi hesabına eklendi!`
                    : bonusInfo.canClaim
                      ? "Bugünkü bonusunu al!"
                      : `Sonraki bonus: ${getTimeUntilNext()}`
                  }
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 space-y-4 overflow-y-auto">
          {/* Compact Streak Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className={cn("w-4 h-4", nextStreakInfo.color)} />
                <span className="font-bold text-foreground text-sm">Seri: {currentStreak} gün</span>
              </div>
              <span className={cn("text-xs font-medium", nextStreakInfo.color)}>
                {nextStreakInfo.emoji} {nextStreakInfo.title}
              </span>
            </div>

            {/* Compact day dots */}
            <div className="flex justify-between gap-1">
              {days.map((day) => {
                const isCompleted = currentStreak >= day;
                const isCurrent = (claimed ? nextStreak : bonusInfo.streakDays + 1) === day;

                return (
                  <div
                    key={day}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all",
                      isCompleted ? "bg-amber-500/20" : "bg-muted/20",
                      isCurrent && "ring-1.5 ring-amber-500/50"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isCompleted ? "bg-amber-500 text-white" : "bg-muted/30 text-muted-foreground"
                    )}>
                      {isCompleted ? "✓" : day}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bonus Amount - compact */}
          {!claimed && bonusInfo.canClaim && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span className="text-foreground font-bold text-sm">Bugünkü Bonus</span>
              </div>
              <span className="text-2xl font-black text-amber-400">+{bonusInfo.bonusAmount}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Ana Bonus Butonu */}
            {!claimed && (
              <Button
                onClick={handleClaim}
                disabled={!bonusInfo.canClaim || isClaiming}
                className={cn(
                  "w-full h-12 rounded-2xl font-bold text-base transition-all",
                  bonusInfo.canClaim
                    ? "bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white shadow-lg shadow-amber-500/30"
                    : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                )}
              >
                {isClaiming ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Alınıyor...
                  </span>
                ) : bonusInfo.canClaim ? (
                  <span className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Bonusu Al!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {getTimeUntilNext()} sonra
                  </span>
                )}
              </Button>
            )}

            {/* x2 Ödüllü Video Butonu */}
            {!adWatched && (
              <Button
                onClick={handleWatchAd}
                disabled={isWatchingAd || (!claimed && bonusInfo.canClaim)}
                variant="outline"
                className={cn(
                  "w-full h-12 rounded-2xl font-bold border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all",
                  !claimed && bonusInfo.canClaim && "opacity-40"
                )}
              >
                {isWatchingAd ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                    Video yükleniyor...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    🎬 Reklam İzle — x2 Bonus Al!
                  </span>
                )}
              </Button>
            )}

            {/* Video izlendi */}
            {adWatched && (
              <div className="text-center text-xs text-cyan-400/80 py-1">
                ✓ x2 bonus alındı!
              </div>
            )}
          </div>

          {/* Pro üyelik yönlendirme */}
          <div className="text-center">
            <Link
              to="/credits"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Crown className="w-3 h-3" />
              <span>Pro Üyelik ile sınırsız indir</span>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
