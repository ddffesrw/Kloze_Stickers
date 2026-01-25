import { useState, useEffect } from "react";
import { useUserCredits } from "@/hooks/useUserCredits";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Settings, ChevronRight, Crown, LogOut, Bell, Palette, Shield, HelpCircle, Coins, Star, Zap, Gift, Camera, Trash2, Package, Edit, MessageCircle, Share2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarSelector } from "@/components/kloze/AvatarSelector";
import { auth } from "@/lib/supabase";
import defaultAvatar from "@/assets/avatars/male-1.png";
import { getAllUserStickers, deleteSticker, getUserPacks, getUserStats, deletePack, type Sticker, type StickerPack } from "@/services/stickerService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadWhatsAppPack } from "@/services/whatsappService";
import { toast } from "sonner";
import { AdBanner } from "@/components/kloze/AdBanner";
import { Loader2, AlertCircle } from "lucide-react";

import { monetizationService } from "@/services/monetizationService";
import { PurchasesPackage } from "@revenuecat/purchases-capacitor";

// ... existing code ...

export default function ProfilePage() {
  const [userAvatar, setUserAvatar] = useState(defaultAvatar);
  const [userId, setUserId] = useState<string>("");
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { credits, isLoading: creditsLoading } = useUserCredits();
  const [statsData, setStatsData] = useState({
    generated: 0,
    downloads: 0,
    likesReceived: 0,
    favoritesCount: 0
  });
  const [error, setError] = useState<string | null>(null);

  // RevenueCat
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPro, setIsPro] = useState(false);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());



  // ... helpers ...

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("ProfilePage: Starting loadData...");

        // Init RC
        await monetizationService.initialize().catch(err => console.error("RC Init Error:", err));

        const offerings = await monetizationService.getOfferings().catch(() => []);
        setPackages(offerings);

        const proStatus = await monetizationService.checkProStatus().catch(() => false);
        setIsPro(proStatus);

        const user = await auth.getCurrentUser();
        console.log("ProfilePage: User session:", user ? "Found" : "Null");

        if (user) {
          setUserId(user.id);
          setCurrentEmail(user.email || "");

          try {
            // Credits handled by hook
            // const { data: profile } = await supabase.from('profiles').select('credits').eq('id', user.id).single();
            // const userCredits = profile?.credits || 0;
            // setCredits(userCredits);

            const [stickersData, packsData, stats] = await Promise.all([
              getAllUserStickers(user.id),
              getUserPacks(user.id),
              getUserStats(user.id)
            ]);
            setStickers(stickersData);
            setPacks(packsData);
            setStatsData(stats);
          } catch (innerError) {
            console.error("Data fetch error details:", innerError);
            toast.error("Bazı veriler yüklenemedi.");
          }
        }
      } catch (err: any) {
        console.error("ProfilePage Critical Error:", err);
        setError("Profil yüklenirken bir hata oluştu: " + (err.message || "Bilinmeyen hata"));
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const handlePurchase = async () => {
    if (packages.length > 0) {
      // Default to first package (monthly)
      const success = await monetizationService.purchasePackage(packages[0]);
      if (success) {
        setIsPro(true);
        toast.success("Hoş geldin şampiyon! 🌟");
      }
    } else {
      toast.error("Market bağlantısı kurulamadı (Simülatörde çalışmaz)");
    }
  };

  const handleRestore = async () => {
    const success = await monetizationService.restorePurchases();
    if (success) setIsPro(true);
  };

  const handleDeleteSticker = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bu sticker'ı silmek istediğine emin misin?")) return;

    try {
      await deleteSticker(id);
      setStickers(prev => prev.filter(s => s.id !== id));
      toast.success("Sticker silindi.");
    } catch (error) {
      toast.error("Silme işlemi başarısız.");
    }
  };

  const handleDeletePack = async (packId: string) => {
    if (!confirm("Bu paketi silmek istediğine emin misin?")) return;
    try {
      await deletePack(packId);
      setPacks(prev => prev.filter(p => p.id !== packId));
      toast.success("Paket silindi");
    } catch (e) {
      toast.error("Paket silinemedi");
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size} sticker'ı silmek istediğine emin misin?`)) return;

    try {
      // Import bulkDeleteStickers first or assume it exists in service
      // To be safe, we can iterate if service doesn't have bulk (but it does from my memory of verify)
      // Actually let's use the individual delete loop if bulk is missing, BUT I recall seeing bulkDeleteStickers in stickerService.
      // Let's check imports. Yes, need to add import if not there.
      // Wait, let's look at imports. 
      // It's not imported.
      // So I will loop for now to be safe, or update import.
      // Let's implement a simple loop here for safety.

      const ids = Array.from(selectedIds);
      const promises = ids.map(id => deleteSticker(id));
      await Promise.all(promises);

      setStickers(prev => prev.filter(s => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
      toast.success("Seçilenler silindi.");
    } catch (e) {
      toast.error("Toplu silme sırasında hata oluştu.");
    }
  };

  const settingsItems = [
    { icon: Bell, label: "Bildirimler", description: "Push bildirimleri ayarla" },
    { icon: Palette, label: "Görünüm", description: "Tema ve renk tercihleri" },
    { icon: Shield, label: "Gizlilik", description: "Hesap güvenliği" },
    { icon: HelpCircle, label: "Yardım", description: "SSS ve destek" },
  ];

  const stats = [
    { label: "İndirilen", value: statsData.downloads.toString(), icon: "📥" },
    { label: "Beğeni", value: statsData.likesReceived.toString(), icon: "❤️" }, // Or favoritesCount based on user intent. "Favori" usually means "My Favorites". Let's use likesReceived as it flatters the user more (downloads/likes).
    { label: "Üretilen", value: statsData.generated.toString(), icon: "✨" },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card p-6 rounded-2xl border border-destructive/30 text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Hata Oluştu!</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Sayfayı Yenile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background */}
      <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />

      {/* Bulk Action Bar - Sticky Bottom */}
      {isSelectionMode && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div className="glass-card gradient-dark p-4 rounded-2xl flex items-center justify-between border border-white/10 shadow-2xl animate-in slide-in-from-bottom-10 fade-in">
            <span className="text-white font-bold ml-2">{selectedIds.size} seçildi</span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
              >
                İptal
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-black gradient-text">PROFİL</h1>
          {/* Admin Link - Only visible to John */}
          {currentEmail === "johnaxe.storage@gmail.com" && (
            <Link
              to="/admin-dashboard"
              className="p-2.5 rounded-xl glass-card border border-border/30 hover:bg-muted/50 transition-all"
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Link>
          )}
        </div>
      </header>

      <main className="relative z-10 p-4 space-y-6">
        {/* Profile Header */}
        <div className="relative glass-card rounded-3xl p-6 border border-border/30 overflow-hidden">
          {/* Decorative Gradient */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

          <div className="relative flex items-center gap-4">
            <AvatarSelector currentAvatar={userAvatar} onAvatarChange={setUserAvatar}>
              <button className="relative group">
                <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-primary/30 transition-all group-hover:border-primary">
                  <img
                    src={userAvatar}
                    alt={currentEmail.split('@')[0]} // Fallback name
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Camera overlay */}
                <div className="absolute inset-0 rounded-3xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                {isPro ? (
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl gradient-gold glow-gold flex items-center justify-center">
                    <Crown className="w-4 h-4" />
                  </div>
                ) : null}
              </button>
            </AvatarSelector>
            <div className="flex-1">
              <h2 className="text-xl font-black text-foreground">{currentEmail.split('@')[0]}</h2>
              <p className="text-muted-foreground text-sm">{currentEmail}</p>
              {isPro ? (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full gradient-gold text-xs font-bold">
                  <Crown className="w-3 h-3" />
                  PRO Üye
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-muted/50 text-xs font-medium text-muted-foreground">
                  <Star className="w-3 h-3" />
                  Ücretsiz Plan
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-2xl bg-muted/20 border border-border/20">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-xl font-black text-foreground mt-1">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* MY PACKS */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground px-1">Paketlerim ({packs.length})</h3>
          {packs.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto pb-4 px-1 hide-scrollbar">
              {packs.map(pack => (
                <div key={pack.id} className="flex-shrink-0 w-32 group relative">
                  <div className="aspect-square rounded-2xl glass-card border border-border/30 p-2 overflow-hidden relative">
                    {/* Background Link */}
                    <Link to={`/pack/${pack.id}`} className="absolute inset-0 z-0" />

                    {/* Image with Fallback */}
                    <img
                      src={pack.tray_image_url || pack.stickers?.[0]?.image_url || "/placeholder.png"}
                      className="w-full h-full object-contain relative z-0 pointer-events-none"
                      loading="lazy"
                    />

                    {/* Mobile Friendly Menu (3 Dots) */}
                    <div className="absolute top-1 right-1 z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <div className="h-6 w-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors">
                            <MoreVertical className="w-3.5 h-3.5 text-white" />
                          </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 z-50 bg-background/95 backdrop-blur-xl border-border/50">
                          <DropdownMenuItem onClick={() => downloadWhatsAppPack(pack, pack.stickers || [])}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                            <span>WhatsApp</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/pack/${pack.id}`);
                            toast.success("Link kopyalandı!");
                          }}>
                            <Share2 className="w-4 h-4 mr-2" />
                            <span>Paylaş</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeletePack(pack.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Sil</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-center truncate">{pack.title}</p>
                  <p className="text-[10px] text-center text-muted-foreground">{pack.stickers?.length || 0} sticker</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-border/30 text-center">
              <p className="text-xs text-muted-foreground">Henüz paket oluşturmadın.</p>
            </div>
          )}
        </div>

        {/* MY STICKERS GALLERY */}
        <div className="space-y-3 pb-20">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-muted-foreground">Tüm Stickerlarım ({stickers.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              className={isSelectionMode ? "text-primary" : "text-muted-foreground"}
              onClick={() => setIsSelectionMode(!isSelectionMode)}
            >
              {isSelectionMode ? "Bitti" : "Seç"}
            </Button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>
          ) : stickers.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className={cn(
                    "relative aspect-square rounded-2xl glass-card border border-border/30 p-2 group transition-all",
                    isSelectionMode && selectedIds.has(sticker.id) && "ring-2 ring-primary bg-primary/10"
                  )}
                  onClick={() => isSelectionMode && toggleSelection(sticker.id)}
                >
                  <img
                    src={sticker.image_url}
                    alt="Sticker"
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />

                  {/* Selection Checkbox */}
                  {isSelectionMode ? (
                    <div className={cn(
                      "absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedIds.has(sticker.id)
                        ? "bg-primary border-primary"
                        : "border-white/50 bg-black/20"
                    )}>
                      {selectedIds.has(sticker.id) && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteSticker(sticker.id, e)}
                      className="absolute top-1 right-1 p-1.5 rounded-full bg-destructive/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}

                  {sticker.pack_id && !isSelectionMode && (
                    <div className="absolute bottom-1 right-1 text-[10px] bg-black/40 text-white px-1.5 rounded-full">
                      Paketli
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-border/30 text-center">
              <p className="text-muted-foreground">Henüz hiç stickerın yok.</p>
              <Link to="/generate">
                <Button variant="link" className="text-primary mt-2">Hemen Üret</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Credits Card */}
        <div className="glass-card rounded-3xl p-5 border border-secondary/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/20 rounded-full blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary/20 flex items-center justify-center glow-cyan">
                <Coins className="w-7 h-7 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Kredi Bakiyesi</p>
                <p className="text-3xl font-black text-secondary">{credits}</p>
                {/* Credits fetched from DB */}
                <p className="text-[10px] text-muted-foreground">{isPro ? 'Pro Limit' : 'Günlük Limit'}</p>
              </div>
            </div>
            <Button
              className="rounded-2xl gradient-secondary text-secondary-foreground font-bold glow-cyan"
            >
              <Gift className="w-4 h-4 mr-2" />
              Kredi Al
            </Button>
          </div>
        </div>

        {/* Go Pro Banner */}
        {!isPro && (
          <div className="relative overflow-hidden rounded-3xl p-6 border border-primary/30">
            {/* ... (keep content) ... */}
            <div className="relative">
              {/* ... */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {/* ... */}
              </div>

              <Button
                onClick={handlePurchase}
                className="w-full h-14 rounded-2xl gradient-primary text-lg font-bold glow-violet mb-3"
              >
                {packages.length > 0
                  ? `${packages[0].product.priceString} / ${packages[0].packageType === 'ANNUAL' ? 'Yıl' : 'Ay'}`
                  : "Şimdi Başla — ₺29.99/ay"}
              </Button>

              <div className="text-center">
                <button onClick={handleRestore} className="text-[10px] text-muted-foreground underline">Satın Alımları Geri Yükle</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground px-1">Ayarlar</h3>
          <div className="glass-card rounded-3xl overflow-hidden border border-border/30">
            {settingsItems.map((item, index) => (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === "Yardım") {
                    window.location.href = "mailto:johnaxe.storage@gmail.com";
                  } else if (item.label === "Gizlilik") {
                    // Navigate to legal handled by separate button, but let's link it here too
                    window.location.href = "/legal";
                  } else {
                    toast.info("Bu özellik yakında gelecek!");
                  }
                }}
                className={cn(
                  "flex items-center justify-between w-full p-4 hover:bg-muted/20 transition-colors text-left",
                  index !== settingsItems.length - 1 && "border-b border-border/20"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>

        {/* Legal Button */}
        <Link to="/legal">
          <Button
            variant="ghost"
            className="w-full h-14 rounded-2xl justify-start text-muted-foreground hover:bg-muted/10 border border-transparent hover:border-border/30 mb-2"
          >
            <span className="w-5 h-5 mr-3 flex items-center justify-center">⚖️</span>
            Yasal Bilgiler
          </Button>
        </Link>

        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={async () => {
            await auth.signOut();
            window.location.href = "/auth";
          }}
          className="w-full h-14 rounded-2xl justify-start text-destructive hover:text-destructive hover:bg-destructive/10 border border-destructive/20 mb-2"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Çıkış Yap
        </Button>

        {/* Delete Account */}
        <div className="pt-4 pb-8 text-center text-xs text-muted-foreground/50">
          <button
            onClick={() => {
              if (confirm("Hesabını silmek istediğine emin misin? Bu işlem geri alınamaz.")) {
                window.location.href = "mailto:johnaxe.storage@gmail.com?subject=Hesap Silme Talebi&body=Lütfen hesabımı ve verilerimi silin. Kullanıcı ID: " + userId;
              }
            }}
            className="underline hover:text-destructive transition-colors"
          >
            Hesabımı Sil
          </button>
          <p className="mt-1">v1.0.0 • Kloze Inc.</p>
        </div>

        {/* Sticky Ad Banner (Pro değilse) */}
        {!isPro && (
          <div className="fixed bottom-[90px] left-4 right-4 z-30">
            <AdBanner className="shadow-2xl border-primary/20 bg-background/80 backdrop-blur-md" />
          </div>
        )}
      </main>
    </div>
  );
}
