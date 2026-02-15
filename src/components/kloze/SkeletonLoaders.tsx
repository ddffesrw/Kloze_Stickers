import { cn } from "@/lib/utils";

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted/50 relative overflow-hidden",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_2s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent",
        className
      )}
    />
  );
}

/**
 * Pack card skeleton for grids
 */
export function PackCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-square rounded-2xl" />
      <div className="space-y-2 px-1">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}

/**
 * Pack grid skeleton (3 columns)
 */
export function PackGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <PackCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Carousel skeleton
 */
export function CarouselSkeleton() {
  return (
    <div className="flex gap-4 px-4 overflow-hidden">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[280px]"
        >
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      ))}
    </div>
  );
}

/**
 * Category pills skeleton
 */
export function CategoryPillsSkeleton() {
  return (
    <div className="flex gap-2 px-4 overflow-hidden">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton
          key={i}
          className="h-10 w-24 rounded-full flex-shrink-0"
        />
      ))}
    </div>
  );
}

/**
 * Hero banner skeleton
 */
export function HeroBannerSkeleton() {
  return (
    <div className="px-4">
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  );
}

/**
 * Profile header skeleton
 */
export function ProfileHeaderSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4">
      <Skeleton className="w-20 h-20 rounded-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Notification item skeleton
 */
export function NotificationSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-full rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
  );
}

/**
 * Sticker grid skeleton (for generate page)
 */
export function StickerGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-3xl" />
      ))}
    </div>
  );
}

/**
 * Search result skeleton
 */
export function SearchResultSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
      <PackGridSkeleton count={6} />
    </div>
  );
}

/**
 * Full page skeleton for initial load
 */
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-10 h-10 rounded-xl" />
        </div>
      </div>

      {/* Hero */}
      <HeroBannerSkeleton />

      {/* Categories */}
      <CategoryPillsSkeleton />

      {/* Grid */}
      <div className="space-y-3">
        <div className="flex justify-between px-4">
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
        </div>
        <div className="px-4">
          <PackGridSkeleton count={9} />
        </div>
      </div>
    </div>
  );
}
