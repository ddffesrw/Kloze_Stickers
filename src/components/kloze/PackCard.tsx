import { Heart, Download, Crown, Share2, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Share } from "@capacitor/share";
import { toast } from "sonner";
import { useState, memo, useCallback } from "react";
import { ReportModal } from "./ReportModal";

interface PackCardProps {
  pack: any;
  size?: "sm" | "md" | "lg";
  index?: number;
  isLiked?: boolean;
  onLike?: (id: string) => void;
}

function PackCardComponent({ pack, size = "md", isLiked, onLike }: PackCardProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Use display_downloads if set by admin, otherwise real downloads
  const downloads = pack.display_downloads ?? pack.downloads ?? 0;

  const formatDownloads = useCallback((num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }, []);

  const sizeClasses = {
    sm: "rounded-2xl",
    md: "rounded-2xl",
    lg: "rounded-3xl",
  };

  const imageAspect = {
    sm: "aspect-square",
    md: "aspect-square",
    lg: "aspect-[16/10]",
  };

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await Share.share({
        title: pack.title,
        text: `Kloze uygulamasında ${pack.title} sticker paketini keşfet!`,
        url: `https://kloze.app/pack/${pack.id}`,
        dialogTitle: 'Paketi Paylaş',
      });
    } catch (error) {
      // Fallback for web if Capacitor Share fails or not available
      if (navigator.share) {
        navigator.share({
          title: pack.title,
          text: `Kloze uygulamasında ${pack.title} sticker paketini keşfet!`,
          url: `https://kloze.app/pack/${pack.id}`,
        }).catch(console.error);
      } else {
        navigator.clipboard.writeText(`https://kloze.app/pack/${pack.id}`);
        toast.success("Link kopyalandı!");
      }
    }
  }, [pack.id, pack.title]);

  const handleLikeClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(pack.id);
  }, [onLike, pack.id]);

  return (
    <Link
      to={`/pack/${pack.id}`}
      className="block group"
    >
      <div className={cn("relative", sizeClasses[size])}>
        {/* 3D Shadow Layers */}
        <div
          className="absolute inset-0 rounded-2xl bg-black/40 translate-y-2 translate-x-0.5 blur-sm"
        />
        <div
          className="absolute inset-0 rounded-2xl bg-black/20 translate-y-1"
        />

        {/* Card Content */}
        <div
          className={cn(
            "relative overflow-hidden",
            "bg-card border border-border/50",
            "shadow-[0_4px_20px_rgba(0,0,0,0.3)]",
            sizeClasses[size]
          )}
        >
          {/* Top Highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          {/* Cover Image */}
          <div className={cn("relative overflow-hidden bg-muted/20", imageAspect[size])}>
            {/* Placeholder/Skeleton while loading */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted/30 to-muted/10" />
            )}

            <img
              src={pack.tray_image_url || pack.coverImage || pack.stickers?.[0]?.image_url || "/placeholder.png"}
              alt={pack.title || pack.name}
              loading="lazy"
              decoding="async"
              width="512"
              height="512"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                "w-full h-full object-cover",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />



            {/* Favorite Button */}
            <button
              onClick={handleLikeClick}
              className={cn(
                "absolute top-1.5 right-1.5 p-1.5 rounded-xl ",
                "bg-background/50 backdrop-blur-sm border border-white/10",
                "",
                "shadow-md",
                isLiked && "bg-accent/30 border-accent/50"
              )}
            >
              <Heart
                className={cn(
                  "w-3 h-3 ",
                  isLiked
                    ? "fill-accent text-accent"
                    : "text-foreground/80"
                )}
              />
              {/* Like Count */}
              {(pack.likes_count > 0 || isLiked) && (
                <span className={cn("text-[8px] font-bold ml-1 ", isLiked ? "text-accent" : "text-foreground")}>
                  {pack.likes_count || (isLiked ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Share Button (Top Left) */}
            <button
              onClick={handleShare}
              className={cn(
                "absolute top-1.5 left-1.5 p-1.5 rounded-xl ",
                "bg-background/50 backdrop-blur-sm border border-border/30",
                "",
                "shadow-md group/share"
              )}
            >
              <Share2 className="w-3 h-3 text-foreground/80  " />
            </button>

            {/* Report Button (Next to Share) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setReportModalOpen(true);
              }}
              className={cn(
                "absolute top-1.5 left-9 p-1.5 rounded-xl ",
                "bg-background/50 backdrop-blur-sm border border-border/30",
                "",
                "shadow-md group/report"
              )}
              title="İçeriği Rapor Et"
            >
              <Flag className="w-3 h-3 text-foreground/80  " />
            </button>

            {/* Premium Badge (Moved down slightly or to bottom left if needed, keeping top left for share but maybe stacked?) */}
            {/* Let's move Premium Badge to Bottom Left for better visibility/separation */}
            {(pack.isPremium || pack.is_premium) && (
              <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg gradient-gold text-[8px] font-bold shadow-lg z-10">
                <Crown className="w-2.5 h-2.5" />
                <span>PRO</span>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="p-2 -mt-3 relative">
            <h3 className="font-bold text-foreground text-xs truncate">
              {pack.title || pack.name}
            </h3>

            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground truncate">{pack.publisher || pack.creator}</span>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-secondary/10 border border-secondary/20">
                <Download className="w-2.5 h-2.5 text-secondary" />
                <span className="text-[9px] font-bold text-secondary">{formatDownloads(downloads)}</span>
              </div>
            </div>
          </div>

          {/* Bottom shadow line */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-black/20" />
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          packId={pack.id}
          packTitle={pack.title || pack.name}
        />
      )}
    </Link>
  );
}

// Custom comparison function for memo
function arePropsEqual(prevProps: PackCardProps, nextProps: PackCardProps) {
  // Only re-render if these specific props change
  return (
    prevProps.pack.id === nextProps.pack.id &&
    prevProps.isLiked === nextProps.isLiked &&
    prevProps.size === nextProps.size &&
    prevProps.pack.downloads === nextProps.pack.downloads &&
    prevProps.pack.likes === nextProps.pack.likes &&
    prevProps.pack.title === nextProps.pack.title &&
    prevProps.pack.tray_image_url === nextProps.pack.tray_image_url
  );
}

export const PackCard = memo(PackCardComponent, arePropsEqual);