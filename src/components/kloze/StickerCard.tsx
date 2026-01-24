import { cn } from "@/lib/utils";
import { useState } from "react";

interface StickerCardProps {
  src: string;
  alt?: string;
  onClick?: () => void;
  className?: string;
  delay?: number;
}

export function StickerCard({ src, alt = "Sticker", onClick, className, delay = 0 }: StickerCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative aspect-square rounded-2xl overflow-hidden transition-all duration-300",
        "bg-gradient-to-br from-muted/40 to-muted/20 p-3",
        "border border-border/20 hover:border-primary/30",
        "hover:scale-105 hover:bg-muted/40 active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
        "group",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Glow Effect on Hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-300",
        "bg-gradient-radial from-primary/20 to-transparent",
        isHovered && "opacity-100"
      )} />
      
      {/* Sticker Image */}
      <div className="relative w-full h-full flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          className={cn(
            "w-full h-full object-contain transition-all duration-300",
            "sticker-style",
            isHovered && "scale-110"
          )}
        />
      </div>

      {/* Corner Accent */}
      <div className={cn(
        "absolute -top-8 -right-8 w-16 h-16 rounded-full",
        "bg-gradient-to-br from-primary/30 to-transparent blur-xl",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      )} />
    </button>
  );
}
