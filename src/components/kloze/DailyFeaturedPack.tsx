import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, ChevronRight, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDailyFeaturedPack, type StickerPack } from "@/services/stickerPackService";

interface DailyFeaturedPackProps {
  className?: string;
}

/** Milliseconds until midnight (next pack rotation) */
function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatCountdown(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function DailyFeaturedPack({ className }: DailyFeaturedPackProps) {
  const [pack, setPack] = useState<StickerPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(msUntilMidnight());
  const navigate = useNavigate();

  useEffect(() => {
    getDailyFeaturedPack().then((p) => {
      setPack(p);
      setLoading(false);
    });
  }, []);

  // Countdown timer — updates every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(msUntilMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={cn("px-4", className)}>
        <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  if (!pack) return null;

  const coverUrl =
    pack.tray_image_url ||
    (pack.stickers && pack.stickers.length > 0 ? pack.stickers[0].image_url : null);

  // Show up to 4 sticker previews
  const previews = pack.stickers ? pack.stickers.slice(0, 4) : [];

  return (
    <div className={cn("px-4", className)}>
      <button
        onClick={() => navigate(`/pack/${pack.id}`)}
        className="w-full text-left group"
      >
        <div className="relative rounded-2xl overflow-hidden border border-orange-500/20 bg-gradient-to-r from-orange-500/10 via-amber-500/8 to-yellow-500/5 p-4 transition-all duration-200 active:scale-[0.98]">

          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent pointer-events-none" />

          <div className="relative flex items-center gap-4">
            {/* Cover image */}
            <div className="relative flex-shrink-0">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={pack.name}
                  className="w-16 h-16 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Flame className="w-7 h-7 text-orange-400" />
                </div>
              )}
              {/* "Bugün" badge */}
              <div className="absolute -top-2 -left-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full px-2 py-0.5 flex items-center gap-1 shadow-lg shadow-orange-500/30">
                <Flame className="w-2.5 h-2.5 text-white" />
                <span className="text-white text-[9px] font-black tracking-wide">BUGÜN</span>
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                  Günün Paketi
                </span>
              </div>
              <p className="font-black text-foreground text-base leading-tight truncate">
                {pack.name}
              </p>
              {/* Sticker count + bonus credit pill */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {pack.sticker_count || pack.stickers?.length || 0} sticker
                </span>
                <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5">
                  <Coins className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400 text-[10px] font-bold">+1 Bonus Kredi</span>
                </div>
              </div>
            </div>

            {/* Sticker preview strip + arrow */}
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              {previews.length > 0 && (
                <div className="flex -space-x-2">
                  {previews.map((s: any, i: number) => (
                    <img
                      key={s.id || i}
                      src={s.image_url}
                      alt=""
                      className="w-8 h-8 rounded-lg object-cover border border-background"
                      style={{ zIndex: previews.length - i }}
                    />
                  ))}
                </div>
              )}
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-orange-400 transition-colors" />
            </div>
          </div>

          {/* Countdown bar at bottom */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-none"
                style={{ width: `${((86_400_000 - countdown) / 86_400_000) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
              {formatCountdown(countdown)}
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}
