import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PackCard } from "@/components/kloze/PackCard";
import { Input } from "@/components/ui/input";
import { Search, Flame, Clock, Trophy, Crown, Loader2, Heart, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProLeaderboard, type LeaderboardEntry } from "@/services/stickerPackService";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'trending' | 'new' | 'pro'>('trending');
    const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
    const [packs, setPacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        fetchPacks();
        fetchLeaderboard();
    }, [activeTab]);

    const fetchLeaderboard = async () => {
        const data = await getProLeaderboard();
        setLeaderboard(data);
    };

    const fetchPacks = async () => {
        setLoading(true);
        let query = supabase
            .from('sticker_packs')
            .select('*, user_stickers(*)')
            .eq('is_public', true);

        if (activeTab === 'trending') {
            query = query.order('downloads', { ascending: false });
        } else if (activeTab === 'new') {
            query = query.order('published_at', { ascending: false });
        } else if (activeTab === 'pro') {
            // Assuming we can filter by publisher metadata or joint profiles, 
            // but for simple schema let's say filter by high downloads or premium
            query = query.eq('is_premium', true).order('downloads', { ascending: false });
        }

        if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
        }

        const { data } = await query.limit(50);

        // Map stickers as needed for PackCard
        const mapped = (data || []).map(p => ({
            ...p,
            stickers: p.user_stickers?.slice(0, 3) || [] // Take snippet
        }));

        setPacks(mapped);
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchPacks();
    };

    return (
        <div className="min-h-screen bg-background pb-20 relative">
            <div className="fixed inset-0 mesh-gradient opacity-20 pointer-events-none" />

            {/* Header */}
            <div className="sticky top-0 z-30 glass-card border-b border-border/20 px-4 py-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Keşfet
                    </h1>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Paket ara..."
                        className="pl-9 bg-background/50 border-input/50 h-10 rounded-xl"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </form>

                {/* Tabs */}
                <div className="flex gap-2 p-1 bg-muted/30 rounded-xl overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('trending')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === 'trending' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Flame className="w-4 h-4 text-orange-500" />
                        Popüler
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === 'new' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Clock className="w-4 h-4 text-blue-500" />
                        Yeni
                    </button>
                    <button
                        onClick={() => setActiveTab('pro')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === 'pro' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Crown className="w-4 h-4 text-yellow-500" />
                        Pro
                    </button>
                </div>
            </div>

            <div className="p-4 space-y-8">

                {/* Leaderboard (Only on Trending) */}
                {activeTab === 'trending' && leaderboard.length > 0 && (
                    <section>
                        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                            <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
                            Pro Liderler
                        </h3>
                        <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                            {leaderboard.map((user, idx) => (
                                <div key={user.userId} className="snap-start flex-shrink-0 w-36 flex flex-col items-center p-3 rounded-2xl glass-card border border-amber-500/20 bg-gradient-to-br from-background/50 to-muted/20 text-center relative overflow-hidden">
                                    {idx < 3 && (
                                        <div className={cn(
                                            "absolute top-0 right-0 w-8 h-8 flex items-center justify-center font-black text-xs rounded-bl-xl",
                                            idx === 0 ? "bg-amber-400 text-black" :
                                                idx === 1 ? "bg-slate-300 text-black" :
                                                    "bg-amber-700 text-white"
                                        )}>
                                            #{idx + 1}
                                        </div>
                                    )}
                                    <img src={user.avatar} className="w-14 h-14 rounded-full border-2 border-amber-500/30 mb-2" />
                                    <p className="text-xs font-bold line-clamp-1 flex items-center gap-1">
                                        {user.username}
                                        {user.isPro && <Crown className="w-3 h-3 text-amber-400 fill-amber-400" />}
                                    </p>
                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-0.5">
                                            <Heart className="w-3 h-3 text-pink-400" />
                                            {user.totalLikes}
                                        </span>
                                        <span className="flex items-center gap-0.5">
                                            <Download className="w-3 h-3 text-primary" />
                                            {user.totalDownloads}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{user.packCount} paket</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Packs Grid */}
                <section className="grid grid-cols-2 gap-4 pb-20">
                    {packs.map(pack => (
                        <PackCard key={pack.id} pack={pack} />
                    ))}

                    {!loading && packs.length === 0 && (
                        <div className="col-span-2 text-center py-10 text-muted-foreground">
                            Henüz paket bulunamadı.
                        </div>
                    )}

                    {loading && (
                        <div className="col-span-2 flex justify-center py-10">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
