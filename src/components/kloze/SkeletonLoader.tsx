import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  className?: string;
  variant?: "card" | "sticker" | "text" | "circle";
}

export function SkeletonLoader({ className, variant = "card" }: SkeletonLoaderProps) {
  const baseClasses = "shimmer rounded-2xl";

  switch (variant) {
    case "sticker":
      return (
        <div className={cn(baseClasses, "aspect-square", className)} />
      );
    case "text":
      return (
        <div className={cn(baseClasses, "h-4 rounded-lg", className)} />
      );
    case "circle":
      return (
        <div className={cn(baseClasses, "rounded-full", className)} />
      );
    case "card":
    default:
      return (
        <div className={cn("glass-card rounded-2xl overflow-hidden", className)}>
          <div className={cn(baseClasses, "aspect-square rounded-none")} />
          <div className="p-4 space-y-3">
            <div className={cn(baseClasses, "h-4 w-3/4 rounded-lg")} />
            <div className="flex items-center gap-2">
              <div className={cn(baseClasses, "w-5 h-5 rounded-full")} />
              <div className={cn(baseClasses, "h-3 w-1/2 rounded-lg")} />
            </div>
          </div>
        </div>
      );
  }
}

export function StickerGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} variant="sticker" />
      ))}
    </div>
  );
}

export function PackGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLoader key={i} variant="card" />
      ))}
    </div>
  );
}
