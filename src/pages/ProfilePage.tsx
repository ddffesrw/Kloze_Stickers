import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Settings, ChevronRight, Crown, LogOut, Bell, Palette, Shield, HelpCircle, Coins, Star, Gift, Camera, Trash2, Package, Edit, MessageCircle, Share2, MoreVertical, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarSelector } from "@/components/kloze/AvatarSelector";
import { auth } from "@/lib/supabase";
import defaultAvatar from "@/assets/avatars/male-1.png";
import { getAllUserStickers, deleteSticker, getUserStats, addStickersToPack, type Sticker } from "@/services/stickerService";

import { getUserPacks, deleteStickerPack as deletePack, createStickerPack, getLikedPacks, removeStickerFromPack, addStickersToExistingPack, updatePackCover, getStickerPackById, type StickerPack } from "@/services/stickerPackService";
import { PackCard } from "@/components/kloze/PackCard";
import { PackSelectorModal } from "@/components/kloze/PackSelectorModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadWhatsAppPack } from "@/services/whatsappService";
import { toast } from "sonner";
import { Loader2, AlertCircle, Plus, X, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { monetizationService } from "@/services/monetizationService";
import { requestAppReview } from "@/components/kloze/AppReviewPrompt";
import { useAuth } from "@/contexts/AuthContext";
import { usePackInteractions } from "@/hooks/usePackInteractions";

// ... existing code ...

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId: authUserId, credits, isPro } = useAuth();

  // Centralized pack interactions
  const { likedPackIds, setLikedPacks: setLikedPackIds, handleLike, isLiked } = usePackInteractions(authUserId);
  const [userAvatar, setUserAvatar] = useState(defaultAvatar);
  const [currentEmail, setCurrentEmail] = useState<string>("");
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [likedPacks, setLikedPacks] = useState<StickerPack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    generated: 0,
    downloads: 0,
    likesReceived: 0,
    favoritesCount: 0
  });
  const [error, setError] = useState<string | null>(null);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pack Selector Modal State
  const [showPackModal, setShowPackModal] = useState(false);
  const [isPackLoading, setIsPackLoading] = useState(false);

  // Pack Edit Modal State
  const [editingPack, setEditingPack] = useState<StickerPack | null>(null);
  const [packEditModalOpen, setPackEditModalOpen] = useState(false);
  const [packEditStickers, setPackEditStickers] = useState<Sticker[]>([]);
  const [availableStickers, setAvailableStickers] = useState<Sticker[]>([]);
  const [editLoading, setEditLoading] = useState(false);



  // ... helpers ...

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("ProfilePage: Starting loadData...");

        const user = await auth.getCurrentUser();
        console.log("ProfilePage: User session:", user ? "Found" : "Null");

        if (user) {
          setCurrentEmail(user.email || "");

          try {
            const [stickersData, packsData, stats, likedData] = await Promise.all([
              getAllUserStickers(user.id),
              getUserPacks(user.id),
              getUserStats(user.id),
              getLikedPacks(user.id)
            ]);
            setStickers(stickersData);
            setPacks(packsData);
            setStatsData(stats);
            setLikedPacks(likedData);

            // Update liked pack IDs for centralized hook
            const likedIds = new Set(likedData.map(p => p.id));
            setLikedPackIds(likedIds);
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
  }, [authUserId]);

  const handleRestore = async () => {
    const success = await monetizationService.restorePurchases();
    if (success) {
      toast.success("Satın alımlar geri yüklendi!");
    }
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

  /**
   * Add selected stickers to an existing pack
   */
  const handleAddToPack = async (packId: string) => {
    setIsPackLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await addStickersToPack(packId, ids);

      // Update local state - mark stickers as packed
      setStickers(prev =>
        prev.map(s =>
          selectedIds.has(s.id) ? { ...s, pack_id: packId } : s
        )
      );

      // Refresh packs to show updated sticker counts
      const updatedPacks = await getUserPacks(authUserId);
      setPacks(updatedPacks);

      setSelectedIds(new Set());
      setIsSelectionMode(false);
      setShowPackModal(false);
      toast.success(`${ids.length} sticker pakete eklendi!`);
    } catch (e) {
      console.error("Add to pack failed:", e);
      toast.error("Sticker eklenemedi.");
    } finally {
      setIsPackLoading(false);
    }
  };

  /**
   * Create a new pack with selected stickers
   */
  const handleCreateNewPack = async (packName: string) => {
    if (selectedIds.size < 1) {
      toast.error("En az 1 sticker seçmelisin.");
      return;
    }

    setIsPackLoading(true);
    try {
      const ids = Array.from(selectedIds);
      const firstSticker = stickers.find(s => selectedIds.has(s.id));

      const newPack = await createStickerPack(
        authUserId,
        packName,
        "Kloze User",
        ids,
        firstSticker?.image_url || ""
      );

      if (newPack) {
        // Update local state
        setPacks(prev => [newPack, ...prev]);
        setStickers(prev =>
          prev.map(s =>
            selectedIds.has(s.id) ? { ...s, pack_id: newPack.id } : s
          )
        );

        setSelectedIds(new Set());
        setIsSelectionMode(false);
        setShowPackModal(false);
        toast.success(`"${packName}" paketi oluşturuldu!`);
      }
    } catch (e) {
      console.error("Create pack failed:", e);
      toast.error("Paket oluşturulamadı.");
    } finally {
      setIsPackLoading(false);
    }
  };

  /**
   * Open Pack Edit Modal
   */
  const handleEditPack = async (pack: StickerPack) => {
    setEditLoading(true);
    setPackEditModalOpen(true);
    setEditingPack(pack);

    try {
      // Get full pack details with stickers
      const fullPack = await getStickerPackById(pack.id);
      if (fullPack && fullPack.stickers) {
        setPackEditStickers(fullPack.stickers as any);
      }

      // Get available stickers (not in any pack)
      const available = stickers.filter(s => !s.pack_id);
      setAvailableStickers(available);
    } catch (e) {
      console.error("Failed to load pack for editing", e);
      toast.error("Paket yüklenemedi");
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * Remove sticker from pack (in edit mode)
   */
  const handleRemoveStickerFromPack = async (stickerId: string) => {
    if (!editingPack) return;

    try {
      await removeStickerFromPack(stickerId, editingPack.id);
      setPackEditStickers(prev => prev.filter(s => s.id !== stickerId));

      // Add back to available list
      const removed = packEditStickers.find(s => s.id === stickerId);
      if (removed) {
        setAvailableStickers(prev => [...prev, removed as any]);
      }

      toast.success("Sticker paketten çıkarıldı");

      // Refresh packs
      const updatedPacks = await getUserPacks(authUserId);
      setPacks(updatedPacks);
    } catch (e) {
      toast.error("Sticker çıkarılamadı");
    }
  };

  /**
   * Add sticker to pack (in edit mode)
   */
  const handleAddStickerToEditingPack = async (stickerId: string) => {
    if (!editingPack) return;

    try {
      await addStickersToExistingPack(editingPack.id, [stickerId]);

      // Move from available to pack stickers
      const added = availableStickers.find(s => s.id === stickerId);
      if (added) {
        setPackEditStickers(prev => [...prev, added as any]);
        setAvailableStickers(prev => prev.filter(s => s.id !== stickerId));
      }

      toast.success("Sticker pakete eklendi");

      // Refresh packs
      const updatedPacks = await getUserPacks(authUserId);
      setPacks(updatedPacks);
    } catch (e) {
      toast.error("Sticker eklenemedi");
    }
  };

  /**
   * Set sticker as pack cover
   */
  const handleSetPackCover = async (stickerId: string) => {
    if (!editingPack) return;

    try {
      const success = await updatePackCover(editingPack.id, stickerId);
      if (success) {
        toast.success("Kapak fotoğrafı güncellendi");
        // Refresh packs to show new cover
        const updatedPacks = await getUserPacks(authUserId);
        setPacks(updatedPacks);
      } else {
        toast.error("Kapak fotoğrafı güncellenemedi");
      }
    } catch (e) {
      toast.error("Bir hata oluştu");
    }
  };

  const settingsItems = [
    { icon: Bell, label: "Bildirimler", description: "Push bildirimleri ayarla" },
    { icon: Palette, label: "Görünüm", description: "Tema ve renk tercihleri" },
    { icon: Shield, label: "Gizlilik", description: "Hesap güvenliği" },
    { icon: HelpCircle, label: "Yardım", description: "SSS ve destek" },
    { icon: Star, label: "Değerlendir", description: "Play Store'da yorum yap", action: "review" },
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
    <div className="min-h-screen bg-background pb-28 relative overflow-x-hidden">
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
                size="sm"
                disabled={selectedIds.size === 0}
                onClick={() => setShowPackModal(true)}
                className="gradient-primary"
              >
                <Package className="w-4 h-4 mr-2" />
                Pakete Ekle
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
              <h2 className="text-xl font-black text-foreground flex items-center gap-2">
                {currentEmail.split('@')[0]}
                {isPro && <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />}
              </h2>
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

        {/* Minimal PRO Banner */}
        {!isPro && (
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/5 flex items-center justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-black bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                  Kloze PRO'ya Geç
                </h3>
                <p className="text-[10px] text-muted-foreground">Limitsiz & Filigransız Üret</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1.5 relative z-10">
              <Button
                size="sm"
                onClick={() => navigate('/credits')}
                className="h-8 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all text-xs"
              >
                İncele
              </Button>
              <button onClick={handleRestore} className="text-[8px] text-muted-foreground underline">
                Geri Yükle
              </button>
            </div>
          </div>
        )}


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
                          <DropdownMenuItem onClick={() => downloadWhatsAppPack(pack, (pack.stickers || []) as any)}>
                            <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                            <span>WhatsApp</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(`https://kloze.app/pack/${pack.id}`);
                            toast.success("Link kopyalandı!");
                          }}>
                            <Share2 className="w-4 h-4 mr-2" />
                            <span>Paylaş</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditPack(pack)}>
                            <Edit className="w-4 h-4 mr-2 text-primary" />
                            <span>Düzenle</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDeletePack(pack.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            <span>Sil</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-bold text-center truncate">{pack.name}</p>
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

        {/* LIKED PACKS */}
        {likedPacks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <h3 className="text-sm font-bold text-muted-foreground">Beğendiğim Paketler ({likedPacks.length})</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {likedPacks.map((pack) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  size="sm"
                  isLiked={isLiked(pack.id)}
                  onLike={async (packId) => {
                    const result = await handleLike(packId);
                    if (result) {
                      // Remove from liked packs list if unliked
                      if (!result.liked) {
                        setLikedPacks(prev => prev.filter(p => p.id !== packId));
                      }
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* MY STICKERS GALLERY */}
        <div className="space-y-3 pb-20">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-muted-foreground">Tüm Stickerlarım ({stickers.length})</h3>
            {stickers.length > 0 && (
              <Button
                size="sm"
                className={cn(
                  "rounded-full text-xs font-bold px-4 h-8 transition-all",
                  isSelectionMode
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "gradient-primary text-white glow-violet"
                )}
                onClick={() => {
                  if (isSelectionMode) {
                    setSelectedIds(new Set());
                  }
                  setIsSelectionMode(!isSelectionMode);
                }}
              >
                {isSelectionMode ? (
                  <>✓ Bitti</>
                ) : (
                  <><Package className="w-3.5 h-3.5 mr-1.5" /> Paket Yap</>
                )}
              </Button>
            )}
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
                    src={sticker.thumbnail_url || sticker.image_url}
                    alt="Sticker"
                    className="w-full h-full object-contain"
                    loading="lazy"
                    decoding="async"
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





        {/* Settings List */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-muted-foreground px-1">Ayarlar</h3>
          <div className="glass-card rounded-3xl overflow-hidden border border-border/30">
            {settingsItems.map((item, index) => (
              <button
                key={item.label}
                onClick={async () => {
                  if (item.label === "Yardım") {
                    window.location.href = "mailto:johnaxe.storage@gmail.com";
                  } else if (item.label === "Gizlilik") {
                    // Navigate to legal page
                    // Since we are in a mapped function, we cant easily use hook here if not defined above. 
                    // ProfilePage has no 'navigate' hook defined in the snippet I saw?
                    // Let's check imports.
                    // It imports Link but no useNavigate?
                    // I need to add useNavigate to imports and component.
                    navigate("/legal"); // Changed from window.location.href
                  } else if (item.label === "Değerlendir") {
                    await requestAppReview();
                  } else if (item.label === "Bildirimler" || item.label === "Görünüm") {
                    navigate("/settings"); // Changed from window.location.href
                    // Ideally use navigate() but I need to check if I can add the hook easily.
                    // The file is large. I will use window.location.href for safety or better: add navigate.
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

        {/* Legal Links */}
        <div className="space-y-2">
          <Link to="/privacy">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-2xl justify-start text-muted-foreground hover:bg-muted/10 border border-transparent hover:border-border/30"
            >
              <Shield className="w-5 h-5 mr-3" />
              Gizlilik Politikası
            </Button>
          </Link>

          <Link to="/terms">
            <Button
              variant="ghost"
              className="w-full h-12 rounded-2xl justify-start text-muted-foreground hover:bg-muted/10 border border-transparent hover:border-border/30"
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              Kullanım Koşulları
            </Button>
          </Link>
        </div>

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
                window.location.href = "mailto:johnaxe.storage@gmail.com?subject=Hesap Silme Talebi&body=Lütfen hesabımı ve verilerimi silin. Kullanıcı ID: " + authUserId;
              }
            }}
            className="underline hover:text-destructive transition-colors"
          >
            Hesabımı Sil
          </button>
          <p className="mt-1">v1.0.0 • Kloze Inc.</p>
        </div>

        {/* Ad Banner removed */}

        {/* Pack Selector Modal */}
        <PackSelectorModal
          isOpen={showPackModal}
          onClose={() => setShowPackModal(false)}
          stickerCount={selectedIds.size}
          userPacks={packs}
          onAddToPack={handleAddToPack}
          onCreateNewPack={handleCreateNewPack}
          isLoading={isPackLoading}
        />

        {/* Pack Edit Modal */}
        <Dialog open={packEditModalOpen} onOpenChange={setPackEditModalOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-primary" />
                Paketi Düzenle: {editingPack?.name}
              </DialogTitle>
            </DialogHeader>

            {editLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Current Pack Stickers */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Paketteki Stickerlar ({packEditStickers.length})
                  </h4>
                  {packEditStickers.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 p-2 bg-muted/20 rounded-xl max-h-[150px] overflow-y-auto">
                      {packEditStickers.map(sticker => (
                        <div key={sticker.id} className="relative group aspect-square">
                          <img
                            src={sticker.thumbnail_url || sticker.image_url}
                            className="w-full h-full object-contain rounded-lg bg-background/50"
                            loading="lazy"
                            decoding="async"
                          />
                          <button
                            onClick={() => handleRemoveStickerFromPack(sticker.id)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Paketten Çıkar"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleSetPackCover(sticker.id)}
                            className="absolute bottom-1 right-1 w-6 h-6 bg-black/60 backdrop-blur-sm text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-primary"
                            title="Kapak Fotoğrafı Yap"
                          >
                            <ImageIcon className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl">
                      Pakette sticker yok
                    </p>
                  )}
                </div>

                {/* Available Stickers to Add */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-primary" />
                    Eklenebilir Stickerlar ({availableStickers.length})
                  </h4>
                  {availableStickers.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 p-2 bg-primary/5 rounded-xl max-h-[150px] overflow-y-auto border border-primary/20">
                      {availableStickers.map(sticker => (
                        <div key={sticker.id} className="relative group aspect-square">
                          <img
                            src={sticker.thumbnail_url || sticker.image_url}
                            className="w-full h-full object-contain rounded-lg bg-background/50 cursor-pointer hover:ring-2 ring-primary transition-all"
                            onClick={() => handleAddStickerToEditingPack(sticker.id)}
                            loading="lazy"
                            decoding="async"
                          />
                          <div
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-primary/20 rounded-lg cursor-pointer"
                            onClick={() => handleAddStickerToEditingPack(sticker.id)}
                          >
                            <Plus className="w-5 h-5 text-primary" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 rounded-xl">
                      Eklenebilir sticker yok. Önce sticker üretin!
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button onClick={() => setPackEditModalOpen(false)} className="w-full">
                Tamam
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
