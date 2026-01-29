import { useState, useEffect } from "react";
import { Search, X, TrendingUp, Sparkles, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/kloze/CategoryPill";
import { PackCard } from "@/components/kloze/PackCard";
import { categories } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { getAllStickerPacks, searchStickerPacks } from "@/services/stickerPackService";
import { ComingSoonCard } from "@/components/kloze/ComingSoonCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [allPacks, setAllPacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real packs from Supabase
  useEffect(() => {
    const loadPacks = async () => {
      try {
        const packs = await getAllStickerPacks();
        setAllPacks(packs || []);
      } catch (e) {
        console.error("Packs load error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadPacks();
  }, []);

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName)
        ? prev.filter((c) => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const filteredPacks = allPacks.filter((pack) => {
    const matchesQuery =
      !query ||
      (pack.name || pack.title || "").toLowerCase().includes(query.toLowerCase()) ||
      (pack.publisher || pack.creator || "").toLowerCase().includes(query.toLowerCase());

    const matchesCategory =
      selectedCategories.length === 0 ||
      selectedCategories.includes(pack.category);

    return matchesQuery && matchesCategory;
  });

  const popularSearches = ["Meme", "Kedi", "Anime", "Aşk", "Komik", "Gamer"];

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background */}
      <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-xl font-black gradient-text-alt">KEŞFET</h1>
              <p className="text-[10px] text-muted-foreground -mt-1">Binlerce sticker paketi</p>
            </div>
          </div>

          {/* Search Input */}
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
              placeholder="Sticker paketi ara..."
              className="pl-12 pr-10 h-14 rounded-2xl bg-muted/30 border-border/30 text-base"
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
              <h2 className="text-sm font-bold text-muted-foreground">Popüler Aramalar</h2>
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
          <h2 className="text-sm font-bold text-muted-foreground">Kategoriler</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <CategoryPill
                key={cat.id}
                emoji={cat.emoji}
                name={cat.name}
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
              {query || selectedCategories.length > 0 ? "Sonuçlar" : "Tüm Paketler"}
            </h2>
            <span className="text-sm text-muted-foreground px-3 py-1 rounded-full bg-muted/30">
              {filteredPacks.length} paket
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
                  <PackCard pack={pack} />
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
