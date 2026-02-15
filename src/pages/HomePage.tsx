import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Flame, Clock, Sparkles, Download, Heart } from "lucide-react";
import { TrendingCarousel } from "@/components/kloze/TrendingCarousel";
import { CategoryPill } from "@/components/kloze/CategoryPill";
import { PackCard } from "@/components/kloze/PackCard";
import { FloatingStickers } from "@/components/kloze/FloatingStickers";
import { CreditBadge } from "@/components/kloze/CreditBadge";
import { WatchAdButton } from "@/components/kloze/WatchAdButton";
import { NotificationBell } from "@/components/kloze/NotificationBell";
import { PackGridSkeleton, CarouselSkeleton, CategoryPillsSkeleton, HeroBannerSkeleton } from "@/components/kloze/SkeletonLoaders";
import { incrementReviewActionCount } from "@/components/kloze/AppReviewPrompt";
import { categories } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { ComingSoonCard } from "@/components/kloze/ComingSoonCard";
import { HeroBannerSlider } from "@/components/kloze/HeroBannerSlider";
import { getTrendingStickerPacks, getNewStickerPacks, getUserLikedPackIds, togglePackLike, getPlatformStats, type PlatformStats } from "@/services/stickerPackService";
import { toast } from "sonner";
import { getBlockedUsers } from "@/services/blockService";
import { useAuth } from "@/contexts/AuthContext";

const PACK_PAGE_SIZE = 12;

// Module-level cache: survives component unmount/remount (navigating away and back)
const homeCache = {
  trendingPacks: [] as any[],
  newPacks: [] as any[],
  likedPackIds: new Set<string>(),
  blockedUserIds: new Set<string>(),
  hasMoreTrending: true,
  hasMoreNew: true,
  loaded: false,
};

export default function HomePage() {
  // Auth from global context - available immediately, no async wait
  const { userId, credits, isPro, refreshCredits } = useAuth();

  const [activeTab, setActiveTab] = useState<"trending" | "new">("trending");
  const [trendingPacks, setTrendingPacks] = useState<any[]>(homeCache.trendingPacks);
  const [newPacks, setNewPacks] = useState<any[]>(homeCache.newPacks);
  const [likedPackIds, setLikedPackIds] = useState<Set<string>>(homeCache.likedPackIds);
  const likedPackIdsRef = useRef<Set<string>>(homeCache.likedPackIds);

  // Sync ref with state
  useEffect(() => {
    likedPackIdsRef.current = likedPackIds;
  }, [likedPackIds]);
  const [isLoading, setIsLoading] = useState(!homeCache.loaded);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(homeCache.blockedUserIds);

  // Infinite scroll state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreTrending, setHasMoreTrending] = useState(homeCache.hasMoreTrending);
  const [hasMoreNew, setHasMoreNew] = useState(homeCache.hasMoreNew);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Platform stats
  const [stats, setStats] = useState<PlatformStats | null>(null);

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

      homeCache.trendingPacks = t;
      homeCache.newPacks = n;
      homeCache.hasMoreTrending = hmt;
      homeCache.hasMoreNew = hmn;

      if (userId) {
        const [likedIds, blockedIds] = await Promise.all([
          getUserLikedPackIds(userId),
          getBlockedUsers()
        ]);
        setLikedPackIds(likedIds);
        setBlockedUserIds(new Set(blockedIds));
        homeCache.likedPackIds = likedIds;
        homeCache.blockedUserIds = new Set(blockedIds);
      }

      homeCache.loaded = true;
    } catch (e) {
      console.error("Home data load error", e);
    }
  };


  // Fetch pack data on mount
  useEffect(() => {
    const initialLoad = async () => {
      if (homeCache.loaded) {
        setIsLoading(false);
      } else {
        await loadData();
        setIsLoading(false);
      }
    };
    initialLoad();

    // Fetch platform stats (independent, can run anytime)
    getPlatformStats().then(setStats);
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
        if (isTrending) { setHasMoreTrending(false); homeCache.hasMoreTrending = false; }
        else { setHasMoreNew(false); homeCache.hasMoreNew = false; }
      } else {
        // Deduplicate by id
        const existingIds = new Set(currentPacks.map(p => p.id));
        const uniqueNew = morePacks.filter(p => !existingIds.has(p.id));

        if (isTrending) {
          setTrendingPacks(prev => {
            const updated = [...prev, ...uniqueNew];
            homeCache.trendingPacks = updated;
            return updated;
          });
          if (morePacks.length < PACK_PAGE_SIZE) {
            setHasMoreTrending(false);
            homeCache.hasMoreTrending = false;
          }
        } else {
          setNewPacks(prev => {
            const updated = [...prev, ...uniqueNew];
            homeCache.newPacks = updated;
            return updated;
          });
          if (morePacks.length < PACK_PAGE_SIZE) {
            setHasMoreNew(false);
            homeCache.hasMoreNew = false;
          }
        }
      }
    } catch (e) {
      console.error("Load more error:", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTab, trendingPacks, newPacks, hasMoreTrending, hasMoreNew, isLoadingMore]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading) {
          loadMorePacks();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
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

  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  useEffect(() => {
    // Detect low-end devices (approximate check based on CPU cores)
    // Most modern phones have 6-8 cores. Older/budget phones often have 4 or fewer.
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) {
      setIsLowPowerMode(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background Effects - Only show on higher-end devices */}
      {!isLowPowerMode && (
        <>
          <div className="fixed inset-0 mesh-gradient opacity-50 pointer-events-none" />
          <FloatingStickers className="fixed" />
        </>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex-shrink-0">
            <h1 className="text-lg font-black gradient-text leading-none">KLOZE</h1>
            <p className="text-[9px] text-muted-foreground font-medium tracking-widest uppercase">Stickers</p>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5">
            {!isPro && (
              <WatchAdButton onCreditEarned={refreshCredits} />
            )}
            <CreditBadge credits={credits} isPro={isPro} />
            <Link
              to="/search"
              className="p-2 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all"
            >
              <Search className="w-4 h-4 text-muted-foreground" />
            </Link>
            {userId ? (
              <NotificationBell userId={userId} />
            ) : (
              <Link
                to="/auth"
                className="text-xs font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Giriş
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-8 pt-6 overflow-auto pb-28">
          {/* Hero Banner Slider */}
          <div className="px-4">
            {isLoading ? <HeroBannerSkeleton /> : <HeroBannerSlider />}
          </div>

          {/* Platform Stats Banner */}
          {stats && (
            <div className="px-4">
              <div className="relative rounded-3xl p-6 overflow-hidden border border-border/30 bg-gradient-to-br from-background via-background/95 to-background">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-cyan-500/5 to-pink-500/10 pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/10 rounded-full blur-3xl" />

                {/* Stats grid */}
                <div className="relative z-10 grid grid-cols-3 gap-4">
                  {/* Total Stickers */}
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center border border-violet-500/30 shadow-lg shadow-violet-500/10">
                      <Sparkles className="w-6 h-6 text-violet-400" />
                    </div>
                    <p className="text-2xl font-black bg-gradient-to-br from-violet-400 to-purple-400 bg-clip-text text-transparent">
                      {stats.totalStickers.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                      Sticker
                    </p>
                  </div>

                  {/* Total Downloads */}
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                      <Download className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black bg-gradient-to-br from-emerald-400 to-green-400 bg-clip-text text-transparent">
                      {stats.totalDownloads.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                      İndirme
                    </p>
                  </div>

                  {/* Total Likes */}
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center border border-pink-500/30 shadow-lg shadow-pink-500/10">
                      <Heart className="w-6 h-6 text-pink-400" />
                    </div>
                    <p className="text-2xl font-black bg-gradient-to-br from-pink-400 to-rose-400 bg-clip-text text-transparent">
                      {stats.totalLikes.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-1">
                      Beğeni
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <span className="font-bold">Trendler</span>
            </button>
            <button
              onClick={() => setActiveTab("new")}
              className={cn(
                "flex items-center gap-2 pb-3 border-b-2 transition-all",
                activeTab === "new" ? "border-secondary text-secondary" : "border-transparent text-muted-foreground"
              )}
            >
              <Clock className="w-4 h-4" />
              <span className="font-bold">Yeni</span>
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
            <h2 className="text-lg font-bold text-foreground px-4">Kategoriler</h2>
            {isLoading ? (
              <CategoryPillsSkeleton />
            ) : (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
                <CategoryPill
                  emoji="✨"
                  name="Tümü"
                  isActive={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                  color="violet"
                />
                {categories.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    emoji={cat.emoji}
                    name={cat.name}
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
                    <span className="text-sm">Yükleniyor...</span>
                  </div>
                )}
              </div>
            )}

            {/* No more packs indicator */}
            {!isLoading && !(activeTab === "trending" ? hasMoreTrending : hasMoreNew) && filteredPacks.length > 0 && !activeCategory && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">Tüm paketler yüklendi ✨</p>
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
