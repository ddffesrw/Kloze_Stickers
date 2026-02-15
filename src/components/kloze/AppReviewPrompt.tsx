import { useState, useEffect } from "react";
import { Star, X, Heart, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Capacitor } from "@capacitor/core";
import { InAppReview } from "@capacitor-community/in-app-review";
import { firebaseService } from "@/services/firebaseService";

interface AppReviewPromptProps {
  // Minimum actions before showing prompt
  minActions?: number;
  // Minimum days since install
  minDays?: number;
}

const STORAGE_KEY = 'kloze_review_prompt';

interface ReviewData {
  actionCount: number;
  firstOpenDate: string;
  prompted: boolean;
  dismissed: boolean;
  dismissedAt?: string;
  lastReviewDate?: string;
}

export function AppReviewPrompt({
  minActions = 5,
  minDays = 3
}: AppReviewPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkIfShouldPrompt();
  }, []);

  const checkIfShouldPrompt = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let data: ReviewData;

      if (stored) {
        data = JSON.parse(stored);

        // Already prompted or dismissed
        if (data.prompted || data.dismissed) {
          // If dismissed, check if 30 days have passed
          if (data.dismissedAt) {
            const dismissedDate = new Date(data.dismissedAt);
            const now = new Date();
            const daysSinceDismiss = Math.floor(
              (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSinceDismiss < 30) {
              return; // Don't show again within 30 days
            }
          } else {
            return;
          }
        }

        // Check conditions
        const firstOpen = new Date(data.firstOpenDate);
        const now = new Date();
        const daysSinceInstall = Math.floor(
          (now.getTime() - firstOpen.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (data.actionCount >= minActions && daysSinceInstall >= minDays) {
          setShowPrompt(true);
          firebaseService.logAppReviewPromptShown();
        }
      } else {
        // First time - initialize
        data = {
          actionCount: 0,
          firstOpenDate: new Date().toISOString(),
          prompted: false,
          dismissed: false
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.error('Review prompt error:', e);
    }
  };

  const handleRate = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);

    // Log the rating
    firebaseService.logAppReviewSubmitted(rating);

    // Mark as prompted
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: ReviewData = JSON.parse(stored);
      data.prompted = true;
      data.lastReviewDate = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    setShowPrompt(false);

    // If high rating (4-5 stars), trigger native In-App Review
    if (rating >= 4) {
      await triggerInAppReview();
    }

    setIsSubmitting(false);
  };

  const triggerInAppReview = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        // Use native In-App Review API
        await InAppReview.requestReview();
        console.log('[AppReview] In-App Review triggered');
      } catch (error) {
        console.error('[AppReview] In-App Review error:', error);
        // Fallback to store link
        openStore();
      }
    } else {
      // Web fallback
      openStore();
    }
  };

  const handleDismiss = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: ReviewData = JSON.parse(stored);
      data.dismissed = true;
      data.dismissedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    setShowPrompt(false);
  };

  const handleLater = () => {
    // Just close, don't mark as dismissed
    setShowPrompt(false);
  };

  const openStore = () => {
    if (Capacitor.isNativePlatform()) {
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        window.open('market://details?id=com.klozestickers.app', '_system');
      } else if (platform === 'ios') {
        // Replace with your actual App Store ID
        window.open('itms-apps://itunes.apple.com/app/idYOUR_APP_ID', '_system');
      }
    } else {
      // Web fallback
      window.open('https://play.google.com/store/apps/details?id=com.klozestickers.app', '_blank');
    }
  };

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="glass-card gradient-dark border-white/10 max-w-sm">
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4 text-white/60" />
        </button>

        <DialogHeader className="space-y-4">
          {/* Heart icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center">
            <Heart className="w-10 h-10 text-pink-500 fill-pink-500" />
          </div>

          <DialogTitle className="text-center text-xl font-bold text-white">
            KLOZE'u seviyor musun? 💕
          </DialogTitle>

          <p className="text-center text-white/70 text-sm">
            Uygulamamızı değerlendirmen bizi çok mutlu eder ve diğer kullanıcılara yardımcı olur!
          </p>
        </DialogHeader>

        {/* Star rating */}
        <div className="flex justify-center gap-2 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "w-10 h-10 transition-colors",
                  (hoveredRating || rating) >= star
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-white/20"
                )}
              />
            </button>
          ))}
        </div>

        {/* Rating feedback */}
        <p className="text-center text-sm text-white/60 min-h-[20px]">
          {rating === 5 && "Harika! 🎉"}
          {rating === 4 && "Güzel! 😊"}
          {rating === 3 && "Fena değil 🙂"}
          {rating === 2 && "Geliştirebiliriz 🤔"}
          {rating === 1 && "Üzgünüz 😔"}
        </p>

        {/* Actions */}
        <div className="space-y-3 mt-4">
          <Button
            onClick={handleRate}
            disabled={rating === 0 || isSubmitting}
            className={cn(
              "w-full h-12 rounded-xl font-bold",
              rating >= 4
                ? "bg-gradient-to-r from-yellow-500 to-amber-500"
                : "bg-primary"
            )}
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : rating >= 4 ? (
              <>
                <Star className="w-4 h-4 mr-2 fill-current" />
                Play Store'da Değerlendir
              </>
            ) : rating > 0 ? (
              "Teşekkürler!"
            ) : (
              "Yıldız Seç"
            )}
          </Button>

          <Button
            onClick={handleLater}
            variant="ghost"
            className="w-full text-white/60 hover:text-white"
          >
            Daha Sonra
          </Button>
        </div>

        {/* Direct store link */}
        {rating >= 4 && (
          <button
            onClick={openStore}
            className="flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/60 mt-2"
          >
            <ExternalLink className="w-3 h-3" />
            Play Store'u doğrudan aç
          </button>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Increment action count (call after meaningful user actions)
 */
export function incrementReviewActionCount() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: ReviewData = JSON.parse(stored);
      data.actionCount = (data.actionCount || 0) + 1;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.error('Error incrementing action count:', e);
  }
}

/**
 * Manually trigger review prompt (e.g., from settings)
 */
export async function requestAppReview() {
  if (Capacitor.isNativePlatform()) {
    try {
      await InAppReview.requestReview();
      firebaseService.logEvent('manual_review_request');
    } catch (error) {
      console.error('[AppReview] Manual review error:', error);
      // Fallback
      const platform = Capacitor.getPlatform();
      if (platform === 'android') {
        window.open('market://details?id=com.klozestickers.app', '_system');
      }
    }
  } else {
    window.open('https://play.google.com/store/apps/details?id=com.klozestickers.app', '_blank');
  }
}
