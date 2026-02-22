import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Flame, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { TrendingCarousel } from "@/components/kloze/TrendingCarousel";
import { CategoryPill } from "@/components/kloze/CategoryPill";
import { PackCard } from "@/components/kloze/PackCard";
import { CreditBadge } from "@/components/kloze/CreditBadge";
import { WatchAdButton } from "@/components/kloze/WatchAdButton";
import { PackGridSkeleton, CarouselSkeleton, CategoryPillsSkeleton, HeroBannerSkeleton } from "@/components/kloze/SkeletonLoaders";
import { incrementReviewActionCount } from "@/components/kloze/AppReviewPrompt";
import { categories } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { ComingSoonCard } from "@/components/kloze/ComingSoonCard";
import { HeroBannerSlider } from "@/components/kloze/HeroBannerSlider";
import { ThemeToggle } from "@/components/kloze/ThemeToggle";
import { LanguageSelector } from "@/components/kloze/LanguageSelector";
import { getTrendingStickerPacks, getNewStickerPacks, getUserLikedPackIds, togglePackLike } from "@/services/stickerPackService";
import { toast } from "sonner";
import { getBlockedUsers } from "@/services/blockService";
import { useAuth } from "@/contexts/AuthContext";
import { DailyFeaturedPack } from "@/components/kloze/DailyFeaturedPack";
import { MysteryBox } from "@/components/kloze/MysteryBox";

const PACK_PAGE_SIZE = 12;

export default function HomePage() {
  const { t } = useTranslation();

  // Auth from global context - available immediately, no async wait
  const { userId, credits, isPro, refreshCredits } = useAuth();

  const [activeTab, setActiveTab] = useState<"trending" | "new">("trending");
  const [trendingPacks, setTrendingPacks] = useState<any[]>([]);
  const [newPacks, setNewPacks] = useState<any[]>([]);
  const [likedPackIds, setLikedPackIds] = useState<Set<string>>(new Set());
  const likedPackIdsRef = useRef<Set<string>>(new Set());

  // Sync ref with state
  useEffect(() => {
    likedPackIdsRef.current = likedPackIds;
  }, [likedPackIds]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const blockedUserIdsRef = useRef<Set<string>>(new Set());

  // Sync blocked users ref
  useEffect(() => {
    blockedUserIdsRef.current = blockedUserIds;
  }, [blockedUserIds]);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);
  const [hasMoreNew, setHasMoreNew] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const loadMoreTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLoadTimeRef = useRef<number>(0);

  // Load pack data (no auth calls needed - userId comes from context)
  const loadData = async () => {
    try {
      const [trending, newP] = await Promise.all([
        getTrendingStickerPacks(PACK_PAGE_SIZE, 0),
        getNewStickerPacks(PACK_PAGE_SIZE, 0),
      ]);

      const t = trending && trending.length > 0 ? trending : [];
      const n = newP && newP.length > 0 ? newP : [];
      setTrendingPacks(t);
      setNewPacks(n);

      const hmt = t.length >= PACK_PAGE_SIZE;
      const hmn = n.length >= PACK_PAGE_SIZE;
      setHasMoreTrending(hmt);
      setHasMoreNew(hmn);

      if (userId) {
        const [likedIds, blockedIds] = await Promise.all([
          getUserLikedPackIds(userId),
          getBlockedUsers()
        ]);
        setLikedPackIds(likedIds);
        setBlockedUserIds(new Set(blockedIds));
      }
    } catch (e) {
      console.error("Home data load error", e);
    }
  };


  // Fetch pack data on mount
  useEffect(() => {
    const initialLoad = async () => {
      await loadData();
      setIsLoading(false);
    };
    initialLoad();
  }, [userId]); // Re-fetch when user changes (login/logout)

  // Infinite scroll: load more packs
  const loadMorePacks = useCallback(async () => {
    if (isLoadingMore) return;

    const isTrending = activeTab === "trending";
    const currentPacks = isTrending ? trendingPacks : newPacks;
    const hasMore = isTrending ? hasMoreTrending : hasMoreNew;

    if (!hasMore) return;

    setIsLoadingMore(true);
    try {
      const offset = currentPacks.length;
      const morePacks = isTrending
        ? await getTrendingStickerPacks(PACK_PAGE_SIZE, offset)
        : await getNewStickerPacks(PACK_PAGE_SIZE, offset);

      if (morePacks.length === 0) {
        if (isTrending) { setHasMoreTrending(false); }
        else { setHasMoreNew(false); }
      } else {
        // Deduplicate by id
        const existingIds = new Set(currentPacks.map(p => p.id));
        const uniqueNew = morePacks.filter(p => !existingIds.has(p.id));

        if (isTrending) {
          setTrendingPacks(prev => [...prev, ...uniqueNew]);
          if (morePacks.length < PACK_PAGE_SIZE) {
            setHasMoreTrending(false);
          }
        } else {
          setNewPacks(prev => [...prev, ...uniqueNew]);
          if (morePacks.length < PACK_PAGE_SIZE) {
            setHasMoreNew(false);
          }
        }
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTab, trendingPacks, newPacks, hasMoreTrending, hasMoreNew, isLoadingMore]);

  // IntersectionObserver for infinite scroll with debounce
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          // Debounce: prevent multiple rapid calls
          const now = Date.now();
          const timeSinceLastLoad = now - lastLoadTimeRef.current;

          // Only load if at least 500ms has passed since last load
          if (timeSinceLastLoad < 500) {
            return;
          }

          // Clear any pending timer
          if (loadMoreTimerRef.current) {
            clearTimeout(loadMoreTimerRef.current);
          }

          // Debounce the load call by 300ms
          loadMoreTimerRef.current = setTimeout(() => {
            lastLoadTimeRef.current = Date.now();
            loadMorePacks();
          }, 300);
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (loadMoreTimerRef.current) {
        clearTimeout(loadMoreTimerRef.current);
      }
    };
  }, [loadMorePacks, isLoading]);

  // 2. Handle Like
  const handleLike = useCallback(async (packId: string) => {
    // Access current state via ref to avoid dependency cycle
    const currentLikedIds = likedPackIdsRef.current;

    if (!userId) {
      toast.error("Beğenmek için giriş yapmalısınız 🔒");
      return;
    }

    // Determine action based on current state (from ref)
    const isLiked = currentLikedIds.has(packId);

    // Optimistic Update for ID Set
    setLikedPackIds(prev => {
      const newSet = new Set(prev);
      if (isLiked) newSet.delete(packId);
      else newSet.add(packId);
      return newSet;
    });

    // Optimistic Update for Count
    const updatePackCount = (list: any[]) => list.map(p => {
      if (p.id === packId) {
        const currentCount = p.likes_count || 0;
        return {
          ...p,
          likes_count: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1
        };
      }
      return p;
    });

    setTrendingPacks(prev => updatePackCount(prev));
    setNewPacks(prev => updatePackCount(prev));

    // Call API (fire and forget mostly, revert on error)
    const result = await togglePackLike(packId);
    if (!result) {
      // Revert on error
      setLikedPackIds(prev => {
        const newSet = new Set(prev);
        if (isLiked) newSet.add(packId); // revert delete
        else newSet.delete(packId); // revert add
        return newSet;
      });
      // Revert counts... (a bit complex but rarely happens, skip for now or notify)
      toast.error("İşlem başarısız 😕");
    } else {
      // Increment review action count
      incrementReviewActionCount();
    }
  }, [userId]);


  const filteredPacks = useMemo(() => {
    const currentList = (activeTab === "trending" ? trendingPacks : newPacks)
      .filter(pack => !blockedUserIds.has(pack.user_id));
    return activeCategory
      ? currentList.filter((pack) => pack.category === activeCategory)
      : currentList;
  }, [activeTab, trendingPacks, newPacks, blockedUserIds, activeCategory]);

  // Virtualization disabled - causes black screen issues with infinite scroll
  // Other optimizations (debounce, memo, reduced animations) are sufficient
  const shouldVirtualize = false;

  const categoryColors: Record<string, "violet" | "cyan" | "pink"> = {
    "Eğlence": "violet",
    "Anime": "pink",
    "Gaming": "cyan",
    "Aşk": "pink",
    "Hayvanlar": "cyan",
    "Meme": "violet",
    "Animated": "cyan",
    "Müzik": "pink",
    "Spor": "violet",
    "Sanat": "pink",
    "Psychedelic": "violet",
  };


  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-x-hidden">
      {/* Background Effects - Removed for performance */}

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-lg font-black gradient-text leading-none">KLOZE</h1>
            <p className="text-[9px] text-muted-foreground font-medium tracking-widest uppercase">Stickers</p>
          </div>

          {/* Right Actions - Simplified */}
          <div className="flex items-center gap-2">
            {!isPro && (
              <WatchAdButton onCreditEarned={refreshCredits} />
            )}
            <CreditBadge credits={credits} isPro={isPro} />
            <LanguageSelector variant="icon" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-6 pt-6 pb-28 overflow-x-hidden">
          {/* Hero Banner Slider - Bigger & More Prominent */}
          <div className="px-4">
            {isLoading ? <HeroBannerSkeleton /> : <HeroBannerSlider />}
          </div>

          {/* Günün Paketi */}
          {!isLoading && <DailyFeaturedPack />}

          {/* Sürpriz Kutu */}
          {!isLoading && <MysteryBox />}

          {/* Tabs */}
          <div className="flex items-center gap-4 px-4 border-b border-border/20">
            <button
              onClick={() => setActiveTab("trending")}
              className={cn(
                "flex items-center gap-2 pb-3 border-b-2 transition-all",
                activeTab === "trending" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >
              <Flame className="w-4 h-4" />
              <span className="font-bold">{t('home.trending')}</span>
            </button>
            <button
              onClick={() => setActiveTab("new")}
              className={cn(
                "flex items-center gap-2 pb-3 border-b-2 transition-all",
                activeTab === "new" ? "border-secondary text-secondary" : "border-transparent text-muted-foreground"
              )}
            >
              <Clock className="w-4 h-4" />
              <span className="font-bold">{t('home.new')}</span>
            </button>
          </div>

          {/* Carousel - Only show on Trending Tab */}
          {activeTab === "trending" && (
            isLoading ? (
              <CarouselSkeleton />
            ) : (
              <TrendingCarousel
                packs={trendingPacks}
                likedPackIds={likedPackIds}
                onLike={handleLike}
              />
            )
          )}

          {/* Categories */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground px-4">{t('home.categories')}</h2>
            {isLoading ? (
              <CategoryPillsSkeleton />
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
                <CategoryPill
                  emoji="✨"
                  name={t('common.all')}
                  isActive={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                  color="violet"
                />
                {categories.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    emoji={cat.emoji}
                    name={t(`categories.${cat.name}`)}
                    isActive={activeCategory === cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    color={categoryColors[cat.name] || "default"}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pack Grid */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                {activeCategory ? activeCategory : (activeTab === "trending" ? "En Popüler" : "En Yeniler")}
              </h2>
              <span className="text-xs text-muted-foreground">
                {isLoading ? "..." : `${filteredPacks.length} paket`}
              </span>
            </div>

            {isLoading ? (
              <PackGridSkeleton count={9} />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {filteredPacks.map((pack, index) => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    index={index}
                    isLiked={likedPackIds.has(pack.id)}
                    onLike={handleLike}
                  />
                ))}
              </div>
            )}

            {/* Infinite scroll sentinel & loading */}
            {!isLoading && (activeTab === "trending" ? hasMoreTrending : hasMoreNew) && !activeCategory && (
              <div ref={loadMoreRef} className="flex justify-center py-6">
                {isLoadingMore && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-sm">{t('home.loadingMore')}</span>
                  </div>
                )}
              </div>
            )}

            {/* No more packs indicator */}
            {!isLoading && !(activeTab === "trending" ? hasMoreTrending : hasMoreNew) && filteredPacks.length > 0 && !activeCategory && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">{t('home.noMorePacks')} ✨</p>
              </div>
            )}

            {!isLoading && filteredPacks.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                  <span className="text-4xl opacity-50">🔍</span>
                </div>
                <p className="text-muted-foreground">Bu kategoride henüz paket yok.</p>
              </div>
            )}
          </div>
        </main>
    </div>
  );
}
