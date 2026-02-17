import { useState, useEffect, useRef, useMemo } from 'react';

interface UseVirtualGridOptions {
  itemCount: number;
  columnCount: number;
  rowHeight: number;
  overscan?: number; // How many rows to render outside viewport
  enabled?: boolean; // Enable/disable virtualization
}

/**
 * Hook for virtual scrolling on grid layouts
 * Only renders items that are visible + overscan buffer
 */
export function useVirtualGrid({
  itemCount,
  columnCount,
  rowHeight,
  overscan = 2,
  enabled = true,
}: UseVirtualGridOptions) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: itemCount });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const ticking = useRef(false);

  const rowCount = Math.ceil(itemCount / columnCount);

  useEffect(() => {
    if (!enabled) {
      setVisibleRange({ start: 0, end: itemCount });
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const updateVisibleRange = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const viewportHeight = window.innerHeight;
      const containerTop = container.offsetTop;

      // Calculate visible row range
      const firstVisibleRow = Math.max(0, Math.floor((scrollTop - containerTop) / rowHeight) - overscan);
      const lastVisibleRow = Math.min(
        rowCount - 1,
        Math.ceil((scrollTop - containerTop + viewportHeight) / rowHeight) + overscan
      );

      // Convert to item indices
      const startIndex = firstVisibleRow * columnCount;
      const endIndex = Math.min(itemCount, (lastVisibleRow + 1) * columnCount);

      setVisibleRange({ start: startIndex, end: endIndex });
      ticking.current = false;
    };

    const handleScroll = () => {
      lastScrollTop.current = window.scrollY || document.documentElement.scrollTop;

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          updateVisibleRange();
        });
        ticking.current = true;
      }
    };

    // Initial calculation
    updateVisibleRange();

    // Listen to scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateVisibleRange);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateVisibleRange);
    };
  }, [itemCount, columnCount, rowHeight, overscan, rowCount, enabled]);

  const virtualItems = useMemo(() => {
    if (!enabled) {
      return Array.from({ length: itemCount }, (_, i) => i);
    }

    const items: number[] = [];
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      items.push(i);
    }
    return items;
  }, [visibleRange, itemCount, enabled]);

  const totalHeight = rowCount * rowHeight;

  return {
    containerRef,
    virtualItems,
    totalHeight,
    visibleRange,
  };
}
