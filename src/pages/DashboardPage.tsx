import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/supabase";
import { BarChart, DollarSign, Image as ImageIcon, Users, Lock } from "lucide-react";
import { estimateCost } from "@/services/stickerGenerationService";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ADMIN_EMAIL = "johnaxe.storage@gmail.com";

export default function DashboardPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        stickerCount: 0,
        userCount: 0,
        estimatedCost: 0
    });

    const [calc, setCalc] = useState({ stickers: 100, cost: 0.02, margin: 50 });

    useEffect(() => {
        const checkAdminAndFetch = async () => {
            // 1. Check Admin
            const user = await auth.getCurrentUser();
            if (!user || user.email !== ADMIN_EMAIL) {
                toast.error("Bu sayfaya erişim yetkiniz yok.");
                navigate("/");
                return;
            }

            // 2. Fetch Stats
            const { count: stickerCount } = await supabase
                .from('user_stickers')
                .select('*', { count: 'exact', head: true });

            const { count: userCount } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            const total = stickerCount || 0;
            const cost = Math.round((total * 0.9 * estimateCost('runware')) * 100) / 100;

            setStats({
                stickerCount: total,
                userCount: userCount || 0,
                estimatedCost: cost
            });
            setLoading(false);
        };

        checkAdminAndFetch();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <Lock className="w-12 h-12 text-primary mx-auto animate-pulse" />
                    <p className="text-muted-foreground">Admin yetkisi kontrol ediliyor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6 pb-28">
            <h1 className="text-3xl font-black gradient-text mb-8">Admin Dashboard</h1>

            <div className="grid grid-cols-2 gap-4">
                {/* Sticker Count */}
                <div className="p-6 rounded-3xl glass-card border border-primary/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="text-muted-foreground font-bold">Stickers</span>
                    </div>
                    <p className="text-3xl font-black text-foreground">{stats.stickerCount}</p>
                </div>

                {/* Estimated Cost */}
                <div className="p-6 rounded-3xl glass-card border border-destructive/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-destructive/20 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-destructive" />
                        </div>
                        <span className="text-muted-foreground font-bold">Cost (Est.)</span>
                    </div>
                    <p className="text-3xl font-black text-foreground">${stats.estimatedCost}</p>
                </div>

                {/* User Count */}
                <div className="col-span-2 p-6 rounded-3xl glass-card border border-secondary/20">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-secondary" />
                        </div>
                        <span className="text-muted-foreground font-bold">Users</span>
                    </div>
                    <p className="text-3xl font-black text-foreground">{stats.userCount}</p>
                </div>
            </div>

            {/* Profit Calculator */}
            <div className="mt-8 p-6 rounded-3xl glass-card border border-border/50">
                <h2 className="text-xl font-bold gradient-text mb-6">Pro Paket Fiyat Hesaplayıcı</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Aylık Ortalama Sticker</label>
                        <input
                            type="number"
                            value={calc.stickers}
                            onChange={(e) => setCalc({ ...calc, stickers: Number(e.target.value) })}
                            className="w-full px-4 py-2 rounded-xl bg-muted/20 border border-border/30"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Sticker Başı Maliyet ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={calc.cost}
                            onChange={(e) => setCalc({ ...calc, cost: Number(e.target.value) })}
                            className="w-full px-4 py-2 rounded-xl bg-muted/20 border border-border/30"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Hedef Kâr Marjı (%)</label>
                        <input
                            type="number"
                            value={calc.margin}
                            onChange={(e) => setCalc({ ...calc, margin: Number(e.target.value) })}
                            className="w-full px-4 py-2 rounded-xl bg-muted/20 border border-border/30"
                        />
                    </div>
                </div>

                <div className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Tahmini Aylık Maliyet</p>
                        <p className="text-lg font-bold">${(calc.stickers * calc.cost).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-muted-foreground">Önerilen Pro Fiyatı</p>
                        <p className="text-3xl font-black gradient-text">
                            ${((calc.stickers * calc.cost) / (1 - calc.margin / 100)).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
