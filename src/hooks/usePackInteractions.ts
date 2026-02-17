import { useState, useCallback, useRef } from 'react';
import { togglePackLike } from '@/services/stickerPackService';
import { toast } from 'sonner';
import { incrementReviewActionCount } from '@/components/kloze/AppReviewPrompt';

/**
 * Centralized hook for pack interactions (like, download, etc.)
 * Use this in ALL pages to ensure consistent behavior
 */
export function usePackInteractions(userId: string | null) {
  const [likedPackIds, setLikedPackIds] = useState<Set<string>>(new Set());
  const likedPackIdsRef = useRef<Set<string>>(new Set());

  // Sync ref with state
  const syncRef = useCallback((ids: Set<string>) => {
    likedPackIdsRef.current = ids;
  }, []);

  // Initialize liked packs
  const setLikedPacks = useCallback((ids: Set<string>) => {
    setLikedPackIds(ids);
    syncRef(ids);
  }, [syncRef]);

  // Handle like/unlike with optimistic updates
  const handleLike = useCallback(async (
    packId: string,
    updatePacksCallback?: (updater: (packs: any[]) => any[]) => void
  ) => {
    if (!userId) {
      toast.error("Beğenmek için giriş yapmalısınız 🔒");
      return null;
    }

    // Get current state from ref to avoid stale closure
    const currentLikedIds = likedPackIdsRef.current;
    const isLiked = currentLikedIds.has(packId);

    // Optimistic Update: Liked IDs
    setLikedPackIds(prev => {
      const newSet = new Set(prev);
      if (isLiked) {
        newSet.delete(packId);
      } else {
        newSet.add(packId);
      }
      syncRef(newSet);
      return newSet;
    });

    // Optimistic Update: Pack count (if callback provided)
    if (updatePacksCallback) {
      updatePacksCallback((packs: any[]) =>
        packs.map(p => {
          if (p.id === packId) {
            const currentCount = p.likes_count || 0;
            return {
              ...p,
              likes_count: isLiked
                ? Math.max(0, currentCount - 1)
                : currentCount + 1
            };
          }
          return p;
        })
      );
    }

    // Call API
    const result = await togglePackLike(packId);

    if (!result) {
      // Revert on error
      setLikedPackIds(prev => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.add(packId); // revert delete
        } else {
          newSet.delete(packId); // revert add
        }
        syncRef(newSet);
        return newSet;
      });

      // Revert pack count
      if (updatePacksCallback) {
        updatePacksCallback((packs: any[]) =>
          packs.map(p => {
            if (p.id === packId) {
              const currentCount = p.likes_count || 0;
              return {
                ...p,
                likes_count: isLiked
                  ? currentCount + 1 // revert decrement
                  : Math.max(0, currentCount - 1) // revert increment
              };
            }
            return p;
          })
        );
      }

      toast.error("İşlem başarısız 😕");
      return null;
    }

    // Success - increment review action count
    incrementReviewActionCount();
    return result;
  }, [userId, syncRef]);

  return {
    likedPackIds,
    setLikedPacks,
    handleLike,
    isLiked: (packId: string) => likedPackIds.has(packId)
  };
}
