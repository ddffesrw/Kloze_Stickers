import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration() {
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = location.pathname;

    // Restore scroll position when navigating back
    const savedPosition = scrollPositions.get(key);
    if (savedPosition !== undefined) {
      setTimeout(() => {
        window.scrollTo(0, savedPosition);
      }, 0);
    }

    // Save scroll position before leaving
    return () => {
      scrollPositions.set(key, window.scrollY);
    };
  }, [location.pathname]);

  return scrollRef;
}
