import { useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({
  onRefresh,
  children,
  className,
  disabled = false
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const pullDistanceRef = useRef(0);

  // Use native event listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (container.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || disabled || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, MAX_PULL);
        pullDistanceRef.current = distance;
        setPullDistance(distance);

        // Prevent default scroll when pulling down
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current || disabled) return;

      isPulling.current = false;
      const currentPull = pullDistanceRef.current;

      if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
        setPullDistance(PULL_THRESHOLD);
        // Use a flag to trigger refresh in React state
        setIsRefreshing(true);
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    // CRITICAL: { passive: false } allows preventDefault() in touchmove
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [disabled, isRefreshing]);

  // Handle refresh when isRefreshing becomes true
  useEffect(() => {
    if (!isRefreshing) return;

    const doRefresh = async () => {
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    doRefresh();
  }, [isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = progress * 180;
  const shouldTrigger = pullDistance >= PULL_THRESHOLD;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-0 right-0 flex justify-center transition-opacity duration-200 z-50",
          pullDistance > 10 || isRefreshing ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(0, pullDistance - 40),
          transform: `translateY(${isRefreshing ? 20 : 0}px)`
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-background/90 backdrop-blur-sm border border-border/50 shadow-lg",
            shouldTrigger || isRefreshing ? "border-primary/50" : ""
          )}
        >
          <RefreshCw
            className={cn(
              "w-5 h-5 transition-all duration-200",
              isRefreshing ? "animate-spin text-primary" : "text-muted-foreground",
              shouldTrigger && !isRefreshing ? "text-primary" : ""
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`
            }}
          />
        </div>
      </div>

      {/* Content with pull offset */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? PULL_THRESHOLD / 2 : pullDistance / 2}px)`,
          transition: isPulling.current ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  );
}
