import { Crown, ArrowRight, Download, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TrendingCarouselProps {
  packs: any[];
  likedPackIds?: Set<string>;
  onLike?: (id: string) => void;
}

export function TrendingCarousel({ packs, likedPackIds, onLike }: TrendingCarouselProps) {
  const formatDownloads = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🔥</span>
          <h2 className="text-sm font-bold text-foreground">Trend</h2>
        </div>
        <Link
          to="/search"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Tümü
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {packs.map((pack, index) => {
          const isLiked = likedPackIds?.has(pack.id);
          return (
            <div key={pack.id} className="relative flex-shrink-0 w-[160px] group">
              <Link
                to={`/pack/${pack.id}`}
                className="block"
              >
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden glass-card border border-border/30 group-hover:border-primary/30 transition-all group-hover:scale-[1.02] active:scale-[0.98]">
                  {/* Background Image */}
                  <img
                    src={pack.tray_image_url || pack.coverImage}
                    alt={pack.title || pack.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />

                  {/* Rank Badge */}
                  <div className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center">
                    <span className="text-xs font-black gradient-text">#{index + 1}</span>
                  </div>

                  {/* Premium Badge */}
                  {(pack.isPremium || pack.is_premium) && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md gradient-gold text-[8px] font-bold">
                      <Crown className="w-2.5 h-2.5" />
                    </div>
                  )}

                  {/* Like Button (Floating) */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onLike?.(pack.id);
                    }}
                    className={cn(
                      "absolute top-2 right-2 p-1.5 rounded-xl transition-all duration-200 z-20",
                      "bg-background/50 backdrop-blur-sm border border-white/10",
                      "hover:scale-110 active:scale-90",
                      isLiked && "bg-accent/30 border-accent/50"
                    )}
                  >
                    <Heart
                      className={cn(
                        "w-3 h-3 transition-colors",
                        isLiked ? "fill-accent text-accent" : "text-white/80"
                      )}
                    />
                  </button>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-bold text-foreground text-sm truncate">{pack.title || pack.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-muted-foreground text-[10px] truncate">{pack.publisher || pack.creator}</p>
                      <div className="flex items-center gap-0.5 text-secondary">
                        <Download className="w-2.5 h-2.5" />
                        <span className="text-[10px] font-semibold">{formatDownloads(pack.display_downloads ?? pack.downloads ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  );
}
