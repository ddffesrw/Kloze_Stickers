import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, Sparkles, Lock, ChevronRight, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRandomPack, type StickerPack } from "@/services/stickerPackService";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { getGuestCredits, setGuestCredits } from "@/components/kloze/WatchAdButton";

const MYSTERY_COST = 1; // credits
const STORAGE_KEY = "kloze_mystery_seen"; // avoid same pack twice

function getSeenPackIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function addSeenPackId(id: string) {
  try {
    const seen = getSeenPackIds();
    // Keep last 20 to avoid always seeing same packs forever
    const updated = [...seen, id].slice(-20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

type BoxState = "idle" | "opening" | "revealed";

interface MysteryBoxProps {
  className?: string;
}

export function MysteryBox({ className }: MysteryBoxProps) {
  const [boxState, setBoxState] = useState<BoxState>("idle");
  const [revealedPack, setRevealedPack] = useState<StickerPack | null>(null);
  const navigate = useNavigate();
  const { user, credits, setCreditsLocal, isPro } = useAuth();

  const hasEnoughCredits = (): boolean => {
    if (isPro) return true;
    if (user) return credits >= MYSTERY_COST;
    return getGuestCredits() >= MYSTERY_COST;
  };

  const deductCredit = async () => {
    if (isPro) return; // pro = free
    if (user) {
      const { error } = await supabase.rpc("deduct_credits", { amount: MYSTERY_COST });
      if (error) throw new Error("Kredi düşülemedi");
      setCreditsLocal(credits - MYSTERY_COST);
    } else {
      const g = getGuestCredits();
      if (g < MYSTERY_COST) throw new Error("Yetersiz kredi");
      setGuestCredits(g - MYSTERY_COST);
      setCreditsLocal(g - MYSTERY_COST);
      window.dispatchEvent(new Event("guest-credits-updated"));
    }
  };

  const handleOpen = async () => {
    if (boxState !== "idle") return;

    if (!hasEnoughCredits()) {
      toast.error(`Sürpriz kutu için ${MYSTERY_COST} kredi gerekiyor 💰`);
      return;
    }

    setBoxState("opening");

    try {
      await deductCredit();
      const seen = getSeenPackIds();
      const pack = await getRandomPack(seen);

      if (!pack) {
        toast.error("Şu an uygun paket bulunamadı, birazdan tekrar dene");
        setBoxState("idle");
        return;
      }

      addSeenPackId(pack.id);
      setRevealedPack(pack);

      // Brief animation delay before showing
      setTimeout(() => setBoxState("revealed"), 600);
    } catch (e: any) {
      toast.error(e?.message || "Bir hata oluştu");
      setBoxState("idle");
    }
  };

  const handleReset = () => {
    setBoxState("idle");
    setRevealedPack(null);
  };

  const coverUrl =
    revealedPack?.tray_image_url ||
    (revealedPack?.stickers && revealedPack.stickers.length > 0
      ? revealedPack.stickers[0].image_url
      : null);

  const previews = revealedPack?.stickers ? revealedPack.stickers.slice(0, 5) : [];

  return (
    <div className={cn("px-4", className)}>
      <div
        className={cn(
          "relative rounded-2xl overflow-hidden border transition-all duration-300",
          boxState === "revealed"
            ? "border-violet-500/40 bg-gradient-to-r from-violet-500/10 via-pink-500/8 to-transparent"
            : "border-white/10 bg-gradient-to-r from-white/5 to-transparent"
        )}
      >
        {/* Header row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
              boxState === "revealed"
                ? "bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg shadow-violet-500/30"
                : "bg-white/8"
            )}>
              {boxState === "revealed" ? (
                <Sparkles className="w-4 h-4 text-white" />
              ) : (
                <Gift className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Sürpriz Kutu</p>
              <p className="text-[10px] text-muted-foreground">Rastgele bir paket keşfet</p>
            </div>
          </div>

          {/* Cost badge */}
          {boxState !== "revealed" && (
            <div className="flex items-center gap-1 bg-white/6 border border-white/10 rounded-full px-2.5 py-1">
              <Coins className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-bold text-foreground">{isPro ? "Ücretsiz" : `${MYSTERY_COST} Kredi`}</span>
            </div>
          )}
        </div>

        {/* Body */}
        {boxState === "idle" && (
          <button
            onClick={handleOpen}
            className={cn(
              "w-full px-4 pb-4 flex items-center gap-3 group",
              !hasEnoughCredits() && "opacity-60"
            )}
          >
            {/* Box visual */}
            <div className="relative w-20 h-20 flex-shrink-0">
              {/* Question marks */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/20 flex items-center justify-center">
                <span className="text-3xl">🎁</span>
              </div>
              {!hasEnoughCredits() && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white/60" />
                </div>
              )}
            </div>

            <div className="flex-1 text-left">
              <p className="text-sm text-foreground font-semibold">
                {hasEnoughCredits()
                  ? "Kutunu aç, sürpriz paketi bul!"
                  : `${MYSTERY_COST} kredi gerekiyor`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasEnoughCredits()
                  ? "Her açılışta farklı bir paket"
                  : "Reklam izleyerek kredi kazanabilirsin"}
              </p>
            </div>

            {hasEnoughCredits() && (
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 transition-colors flex-shrink-0" />
            )}
          </button>
        )}

        {/* Opening animation */}
        {boxState === "opening" && (
          <div className="px-4 pb-4 flex items-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Kutu açılıyor...</p>
              <p className="text-xs text-muted-foreground">Sürprize hazır ol! ✨</p>
            </div>
          </div>
        )}

        {/* Revealed state */}
        {boxState === "revealed" && revealedPack && (
          <div className="px-4 pb-4 space-y-3 animate-in fade-in duration-300">
            {/* Pack info */}
            <div className="flex items-center gap-3">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={revealedPack.name}
                  className="w-20 h-20 rounded-2xl object-cover border border-violet-500/30"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-violet-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                  <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Keşfettin!</span>
                </div>
                <p className="font-black text-foreground text-base leading-tight">
                  {revealedPack.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {revealedPack.sticker_count || revealedPack.stickers?.length || 0} sticker
                </p>
              </div>
            </div>

            {/* Sticker strip */}
            {previews.length > 0 && (
              <div className="flex gap-1.5">
                {previews.map((s: any, i: number) => (
                  <img
                    key={s.id || i}
                    src={s.image_url}
                    alt=""
                    className="w-11 h-11 rounded-lg object-cover border border-white/10"
                  />
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => navigate(`/pack/${revealedPack.id}`)}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/25 active:scale-[0.97] transition-transform"
              >
                <ChevronRight className="w-4 h-4" />
                Pakete Git
              </button>
              <button
                onClick={handleReset}
                className="h-10 px-4 rounded-xl bg-white/8 border border-white/10 text-sm text-muted-foreground font-medium active:scale-[0.97] transition-transform"
              >
                Tekrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
