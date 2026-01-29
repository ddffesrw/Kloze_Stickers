import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Bell, Sparkles, Flame, Clock, Crown } from "lucide-react";
import { TrendingCarousel } from "@/components/kloze/TrendingCarousel";
import { CategoryPill } from "@/components/kloze/CategoryPill";
import { PackCard } from "@/components/kloze/PackCard";
import { FloatingStickers } from "@/components/kloze/FloatingStickers";
import { categories, allPacks } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { AdBanner } from "@/components/kloze/AdBanner";
import { ComingSoonCard } from "@/components/kloze/ComingSoonCard";
import { HeroBannerSlider } from "@/components/kloze/HeroBannerSlider";
import { getTrendingStickerPacks, getNewStickerPacks, getUserLikedPackIds, togglePackLike } from "@/services/stickerPackService";
import { auth, supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"trending" | "new">("trending");
  const [trendingPacks, setTrendingPacks] = useState<any[]>([]);
  const [newPacks, setNewPacks] = useState<any[]>([]);
  const [likedPackIds, setLikedPackIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);

  // 1. Fetch Real Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [trending, newP, user] = await Promise.all([
          getTrendingStickerPacks(),
          getNewStickerPacks(),
          auth.getCurrentUser()
        ]);

        if (trending && trending.length > 0) setTrendingPacks(trending);
        if (newP && newP.length > 0) setNewPacks(newP);

        if (user) {
          const likedIds = await getUserLikedPackIds(user.id);
          setLikedPackIds(likedIds);

          // Check Pro status
          const { data: profile } = await supabase
            .from('profiles')
            .select('is_pro')
            .eq('id', user.id)
            .single();
          setIsPro(profile?.is_pro || false);
        }
      } catch (e) {
        console.error("Home data load error", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. Handle Like
  const handleLike = async (packId: string) => {
    // Optimistic Update
    const isLiked = likedPackIds.has(packId);
    const newLikedIds = new Set(likedPackIds);
    if (isLiked) newLikedIds.delete(packId);
    else newLikedIds.add(packId);
    setLikedPackIds(newLikedIds);

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

    // Call API
    const result = await togglePackLike(packId);
    if (!result) {
      // Revert on error
      setLikedPackIds(likedPackIds);
      toast.error("İşlem başarısız 😕");
    }
  };


  const currentList = activeTab === "trending" ? trendingPacks : newPacks;

  const filteredPacks = activeCategory
    ? currentList.filter((pack) => pack.category === activeCategory)
    : currentList;

  const categoryColors: Record<string, "violet" | "cyan" | "pink"> = {
    "Eğlence": "violet",
    "Anime": "pink",
    "Gaming": "cyan",
    "Aşk": "pink",
    "Hayvanlar": "cyan",
    "Meme": "violet",
  };

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background Effects */}
      <div className="fixed inset-0 mesh-gradient opacity-50 pointer-events-none" />
      <FloatingStickers className="fixed" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center glow-violet">
                <span className="text-xl">🎨</span>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-secondary glow-cyan animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black gradient-text">KLOZE</h1>
              <p className="text-[10px] text-muted-foreground -mt-1">Sticker Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent glow-pink" />
            </button>
            <Link
              to="/search"
              className="p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 transition-all"
            >
              <Search className="w-5 h-5 text-muted-foreground" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-8 pt-6">
        {/* Hero Banner Slider */}
        <div className="px-4">
          <HeroBannerSlider />
        </div>

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
            <div className="px-4"><div className="h-48 w-full rounded-2xl bg-muted/20 animate-pulse" /></div>
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
        </div>

        {/* Pack Grid */}
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">
              {activeCategory ? activeCategory : (activeTab === "trending" ? "En Popüler" : "En Yeniler")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {filteredPacks.length} paket
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {filteredPacks.map((pack, index) => (
              <div key={pack.id} className="contents">
                <PackCard
                  pack={pack}
                  index={index}
                  isLiked={likedPackIds.has(pack.id)}
                  onLike={handleLike}
                />

                {(index > 0 && (index + 1) % 6 === 0) && (
                  <div className="col-span-3 my-2">
                    <AdBanner isPro={isPro} />
                  </div>
                )}
              </div>
            ))}

            {/* Coming Soon Card at the end */}
            <ComingSoonCard />
          </div>

          {filteredPacks.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <span className="text-4xl opacity-50">🔍</span>
              </div>
              <p className="text-muted-foreground">Bu kategoride henüz paket yok.</p>
            </div>
          )}
        </div>

        {/* Sticky Bottom Ad Banner - Only for free users */}
        {!isPro && (
          <div className="fixed bottom-20 left-4 right-4 z-30">
            <AdBanner isPro={isPro} className="shadow-xl bg-background/90 backdrop-blur-md border-primary/20" />
          </div>
        )}
      </main>
    </div>
  );
}
