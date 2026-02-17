import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search, X, TrendingUp, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/kloze/CategoryPill";
import { PackCard } from "@/components/kloze/PackCard";
import { CreditBadge } from "@/components/kloze/CreditBadge";
import { WatchAdButton } from "@/components/kloze/WatchAdButton";
import { categories } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { getAllStickerPacks, getUserLikedPackIds, togglePackLike } from "@/services/stickerPackService";
import { ComingSoonCard } from "@/components/kloze/ComingSoonCard";
import { getBlockedUsers } from "@/services/blockService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { incrementReviewActionCount } from "@/components/kloze/AppReviewPrompt";

export default function SearchPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [allPacks, setAllPacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [likedPackIds, setLikedPackIds] = useState<Set<string>>(new Set());
  const likedPackIdsRef = useRef<Set<string>>(new Set());

  // Sync ref with state
  useEffect(() => {
    likedPackIdsRef.current = likedPackIds;
  }, [likedPackIds]);

  const { userId, credits, isPro, refreshCredits } = useAuth();

  // Fetch real packs from Supabase
  useEffect(() => {
    const loadPacks = async () => {
      try {
        const packs = await getAllStickerPacks();
        setAllPacks(packs || []);

        if (userId) {
          const [blockedIds, likedIds] = await Promise.all([
            getBlockedUsers(),
            getUserLikedPackIds(userId)
          ]);
          setBlockedUserIds(new Set(blockedIds));
          setLikedPackIds(likedIds);
        }
      } catch (e) {
        console.error("Packs load error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadPacks();
  }, [userId]);

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  // Handle Like
  const handleLike = useCallback(async (packId: string) => {
    const currentLikedIds = likedPackIdsRef.current;

    if (!userId) {
      toast.error("Beğenmek için giriş yapmalısınız 🔒");
      return;
    }

    const isLiked = currentLikedIds.has(packId);

    // Optimistic Update for ID Set
    setLikedPackIds(prev => {
      const newSet = new Set(prev);
      if (isLiked) newSet.delete(packId);
      else newSet.add(packId);
      return newSet;
    });

    // Optimistic Update for Count
    setAllPacks(prev => prev.map(p => {
      if (p.id === packId) {
        const currentCount = p.likes_count || 0;
        return {
          ...p,
          likes_count: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1
        };
      }
      return p;
    }));

    // Call API
    const result = await togglePackLike(packId);
    if (!result) {
      // Revert on error
      setLikedPackIds(prev => {
        const newSet = new Set(prev);
        if (isLiked) newSet.add(packId);
        else newSet.delete(packId);
        return newSet;
      });
      toast.error("İşlem başarısız 😕");
    } else {
      incrementReviewActionCount();
    }
  }, [userId]);

  const filteredPacks = useMemo(() => {
    return allPacks.filter((pack) => {
      const matchesQuery =
        !query ||
        (pack.name || pack.title || "").toLowerCase().includes(query.toLowerCase()) ||
        (pack.publisher || pack.creator || "").toLowerCase().includes(query.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(pack.category);

      const isNotBlocked = !blockedUserIds.has(pack.user_id);

      return matchesQuery && matchesCategory && isNotBlocked;
    });
  }, [allPacks, query, selectedCategories, blockedUserIds]);

  const popularSearches = ["Meme", "Kedi", "Anime", "Aşk", "Komik", "Gamer"];

  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-x-hidden">
      {/* Background - Removed for performance */}

      {/* Header - Ana sayfa ile aynı stil */}
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
          </div>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-3">
          <div className={cn(
            "relative rounded-2xl transition-all duration-300",
            isFocused && "ring-2 ring-primary/50"
          )}>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t('search.placeholder')}
              className="pl-12 pr-10 h-12 rounded-2xl bg-muted/30 border-border/30 text-base"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 p-4 space-y-6">
        {/* Popular Searches */}
        {!query && selectedCategories.length === 0 && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-bold text-muted-foreground">{t('search.popularSearches')}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map((search, index) => (
                <button
                  key={search}
                  onClick={() => setQuery(search)}
                  className="px-4 py-2.5 rounded-2xl glass-card border border-border/30 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all hover:scale-105"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground">{t('home.categories')}</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                emoji={cat.emoji}
                name={t(`categories.${cat.name}`)}
                isActive={selectedCategories.includes(cat.name)}
                onClick={() => toggleCategory(cat.name)}
              />
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              {query || selectedCategories.length > 0 ? t('search.results') : t('search.allPacks')}
            </h2>
            <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted/30">
              {filteredPacks.length} {t('packDetail.stickers').toLowerCase()}
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredPacks.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredPacks.map((pack, index) => (
                <div
                  key={pack.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <PackCard
                    pack={pack}
                    index={index}
                    isLiked={likedPackIds.has(pack.id)}
                    onLike={handleLike}
                  />
                </div>
              ))}

              {/* Coming Soon Card */}
              <ComingSoonCard />
            </div>
          ) : (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                <span className="text-5xl">🔍</span>
              </div>
              <p className="text-muted-foreground text-lg">Sonuç bulunamadı</p>
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedCategories([]);
                }}
                className="mt-4 px-6 py-2 rounded-full bg-primary/20 text-primary font-medium hover:bg-primary/30 transition-colors"
              >
                Filtreleri temizle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
