import { useState, useEffect, useCallback } from "react";
import { Star, X, Sparkles, ThumbsUp, MessageSquarePlus, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";
import { firebaseService } from "@/services/firebaseService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "kloze_review_prompt";
// Custom event: dispatched from PackDetailPage after first successful WA transfer
export const REVIEW_TRIGGER_EVENT = "kloze_whatsapp_transfer_success";

const FIVE_STAR_BONUS = 2; // credits awarded for 5-star rating

interface ReviewData {
  prompted: boolean;
  dismissed: boolean;
  dismissedAt?: string;
  lastReviewDate?: string;
  transferCount: number;
  bonusClaimed: boolean; // prevent double-claiming
}

function getReviewData(): ReviewData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (_) {}
  return { prompted: false, dismissed: false, transferCount: 0, bonusClaimed: false };
}

function saveReviewData(data: ReviewData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) {}
}

/** Call this after a successful WhatsApp sticker transfer */
export function notifyWhatsAppTransferSuccess() {
  const data = getReviewData();
  data.transferCount = (data.transferCount || 0) + 1;
  saveReviewData(data);
  window.dispatchEvent(new CustomEvent(REVIEW_TRIGGER_EVENT, { detail: { transferCount: data.transferCount } }));
}

/** Manually trigger the native in-app review (e.g. from settings) */
export async function requestAppReview() {
  if (Capacitor.isNativePlatform()) {
    try {
      await InAppReview.requestReview();
      firebaseService.logEvent("manual_review_request");
    } catch {
      openStoreFallback();
    }
  } else {
    openStoreFallback();
  }
}

function openStoreFallback() {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    window.open("market://details?id=com.klozestickers.app", "_system");
  } else if (platform === "ios") {
    window.open("itms-apps://itunes.apple.com/app/idYOUR_APP_ID", "_system");
  } else {
    window.open("https://play.google.com/store/apps/details?id=com.klozestickers.app", "_blank");
  }
}

const STAR_LABELS: Record<number, string> = {
  1: "Hiç beğenmedim",
  2: "Fena",
  3: "İdare eder",
  4: "Güzel!",
  5: "Harika! 🔥",
};

export function AppReviewPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bonusAwarded, setBonusAwarded] = useState(false);

  const { user, credits, setCreditsLocal } = useAuth();

  const shouldShow = useCallback((): boolean => {
    const data = getReviewData();
    if (data.prompted) return false;
    if (data.dismissed && data.dismissedAt) {
      const days = (Date.now() - new Date(data.dismissedAt).getTime()) / 86_400_000;
      if (days < 30) return false;
    }
    return true;
  }, []);

  useEffect(() => {
    const handler = () => {
      if (shouldShow()) {
        // Small delay so WA opens first, then we show when user comes back
        setTimeout(() => setShowPrompt(true), 2500);
      }
    };
    window.addEventListener(REVIEW_TRIGGER_EVENT, handler);
    return () => window.removeEventListener(REVIEW_TRIGGER_EVENT, handler);
  }, [shouldShow]);

  const giveBonus = async (): Promise<boolean> => {
    // Only for logged-in users, only once
    const data = getReviewData();
    if (data.bonusClaimed || !user?.id) return false;

    try {
      const { error } = await supabase.rpc("add_credits", {
        user_id: user.id,
        amount: FIVE_STAR_BONUS,
      });
      if (error) throw error;

      // Mark claimed & update local credits immediately
      data.bonusClaimed = true;
      saveReviewData(data);
      setCreditsLocal(credits + FIVE_STAR_BONUS);
      setBonusAwarded(true);
      return true;
    } catch (e) {
      console.error("[AppReview] bonus credit error:", e);
      return false;
    }
  };

  const handleRate = async () => {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);

    firebaseService.logAppReviewSubmitted(rating);

    const data = getReviewData();
    data.prompted = true;
    data.lastReviewDate = new Date().toISOString();
    saveReviewData(data);

    if (rating === 5) {
      // Give bonus credits, then show success, then native review
      await giveBonus();
      setSubmitted(true);
      setTimeout(async () => {
        setShowPrompt(false);
        await triggerNativeReview();
      }, 1800);
    } else if (rating === 4) {
      setSubmitted(true);
      setTimeout(async () => {
        setShowPrompt(false);
        await triggerNativeReview();
      }, 1400);
    } else {
      // 1-3: just thank and close
      setSubmitted(true);
      setTimeout(() => setShowPrompt(false), 1400);
    }

    setIsSubmitting(false);
  };

  const triggerNativeReview = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await InAppReview.requestReview();
      } catch {
        openStoreFallback();
      }
    } else {
      openStoreFallback();
    }
  };

  const handleDismiss = () => {
    const data = getReviewData();
    data.dismissed = true;
    data.dismissedAt = new Date().toISOString();
    saveReviewData(data);
    setShowPrompt(false);
  };

  const handleLater = () => setShowPrompt(false);

  if (!showPrompt) return null;

  const displayRating = hovered || rating;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={handleLater}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-6 z-[91] max-w-sm mx-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50 bg-[#0f0f0f]">

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/50" />
          </button>

          {/* Top gradient band */}
          <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-pink-500 to-amber-400" />

          <div className="px-6 pt-6 pb-7 space-y-5">
            {submitted ? (
              /* ── Submitted state ── */
              <div className="flex flex-col items-center gap-3 py-2 animate-in fade-in duration-300">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center",
                  rating === 5
                    ? "bg-gradient-to-br from-amber-400/20 to-yellow-500/20"
                    : rating >= 4
                    ? "bg-gradient-to-br from-violet-500/20 to-pink-500/20"
                    : "bg-gradient-to-br from-blue-500/20 to-cyan-500/20"
                )}>
                  {rating === 5 ? (
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  ) : rating >= 4 ? (
                    <Sparkles className="w-8 h-8 text-violet-400" />
                  ) : (
                    <ThumbsUp className="w-8 h-8 text-blue-400" />
                  )}
                </div>

                <p className="text-white font-bold text-lg text-center">
                  {rating === 5
                    ? "Muhteşemsin! 🌟"
                    : rating >= 4
                    ? "Teşekkürler! 🙌"
                    : "Geri bildirimin için teşekkürler"}
                </p>

                {/* 5-star bonus badge */}
                {bonusAwarded && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 animate-in fade-in duration-300">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-bold text-sm">
                      +{FIVE_STAR_BONUS} kredi hediye edildi!
                    </span>
                  </div>
                )}

                <p className="text-white/40 text-xs text-center">
                  {rating >= 4
                    ? "Play Store açılıyor..."
                    : "Deneyimini geliştirmek için çalışacağız."}
                </p>
              </div>
            ) : (
              /* ── Rating state ── */
              <>
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                    <MessageSquarePlus className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 pt-0.5">
                    <h2 className="text-white font-black text-lg leading-tight">
                      Stickerin nasıldı? ✨
                    </h2>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                      İlk sticker paketin WhatsApp'a gitti! 🎉{"\n"}
                      Deneyimini bizimle paylaşır mısın?
                    </p>
                  </div>
                </div>

                {/* 5-star bonus hint */}
                <div className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200",
                  displayRating === 5
                    ? "bg-amber-500/15 border-amber-500/40"
                    : "bg-white/3 border-white/8"
                )}>
                  <Coins className={cn(
                    "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                    displayRating === 5 ? "text-amber-400" : "text-white/20"
                  )} />
                  <p className={cn(
                    "text-xs transition-colors duration-200",
                    displayRating === 5 ? "text-amber-300" : "text-white/25"
                  )}>
                    5 yıldız verirsen <span className="font-bold">+{FIVE_STAR_BONUS} kredi</span> hediye!
                  </p>
                </div>

                {/* Stars */}
                <div className="flex justify-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHovered(star)}
                      onMouseLeave={() => setHovered(0)}
                      onTouchStart={() => setHovered(star)}
                      onTouchEnd={() => setHovered(0)}
                      className="p-1 active:scale-90"
                      style={{
                        transform: displayRating >= star ? "scale(1.12)" : "scale(1)",
                        transition: "transform 150ms ease",
                      }}
                    >
                      <Star
                        className={cn(
                          "w-11 h-11 transition-colors duration-150",
                          displayRating >= star
                            ? star === 5
                              ? "text-amber-400 fill-amber-400"
                              : star >= 4
                              ? "text-amber-400 fill-amber-400"
                              : "text-amber-300 fill-amber-300"
                            : "text-white/10 fill-white/5"
                        )}
                      />
                    </button>
                  ))}
                </div>

                {/* Star label */}
                <div className="text-center min-h-[18px]">
                  <span
                    className={cn(
                      "text-sm font-semibold transition-opacity duration-150",
                      displayRating > 0 ? "opacity-100" : "opacity-0",
                      displayRating === 5 ? "text-amber-400" : displayRating >= 4 ? "text-amber-300" : "text-white/60"
                    )}
                  >
                    {STAR_LABELS[displayRating] ?? ""}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="space-y-2.5">
                  <Button
                    onClick={handleRate}
                    disabled={rating === 0 || isSubmitting}
                    className={cn(
                      "w-full h-12 rounded-2xl font-bold text-base transition-all duration-200",
                      rating === 0
                        ? "bg-white/5 text-white/20 cursor-not-allowed"
                        : rating === 5
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/30 hover:opacity-90"
                        : rating >= 4
                        ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/30 hover:opacity-90"
                        : "bg-white/10 text-white hover:bg-white/15"
                    )}
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    ) : rating === 5 ? (
                      <span className="flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        +{FIVE_STAR_BONUS} Kredi Al & Değerlendir
                      </span>
                    ) : rating >= 4 ? (
                      <span className="flex items-center gap-2">
                        <Star className="w-4 h-4 fill-current" />
                        Play Store'da Değerlendir
                      </span>
                    ) : rating > 0 ? (
                      "Gönder"
                    ) : (
                      "Bir yıldız seç"
                    )}
                  </Button>

                  <button
                    onClick={handleLater}
                    className="w-full py-2 text-sm text-white/30 hover:text-white/50 transition-colors"
                  >
                    Daha sonra
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * @deprecated Use notifyWhatsAppTransferSuccess() instead.
 * Kept for backward compatibility only.
 */
export function incrementReviewActionCount() {
  const data = getReviewData();
  data.transferCount = (data.transferCount || 0) + 1;
  saveReviewData(data);
}
