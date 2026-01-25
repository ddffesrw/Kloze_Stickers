import { useState, useEffect } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, Package, Users, DollarSign, Upload, Search,
  Plus, Minus, Crown, Sparkles, Activity, MoreVertical, Eye, Trash2,
  Settings, BarChart3, Bell, CheckCircle, Shield, Zap, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allPacks } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import {
  adminGetAllUsers,
  adminAddCredits,
  adminTogglePro
} from "@/services/adminService";
import {
  getAdminStats,
  createAdminPack,
  getNewPacks as getAllPacks,
  deletePack,
  updatePackTitle
} from "@/services/stickerService";
import { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const ADMIN_EMAIL = "johnaxe.storage@gmail.com";

export default function AdminPage() {
  const navigate = useNavigate();

  // 1. STATE
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [adminStatsData, setAdminStatsData] = useState({ totalPacks: 0, totalUsers: 0, totalStickers: 0, revenue: 0 });

  // Real Data State
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Actions State
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [creditAmount, setCreditAmount] = useState<string>("50");

  // Pack Management State
  const [packs, setPacks] = useState<any[]>([]);
  const [packSearchQuery, setPackSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPackId, setEditPackId] = useState<string>("");
  const [editPackTitle, setEditPackTitle] = useState("");

  // Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [packTitle, setPackTitle] = useState("");
  const [publisher, setPublisher] = useState("Kloze Official");
  const [category, setCategory] = useState("Eğlence");
  const [isPremium, setIsPremium] = useState(false);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);

  // 2. EFFECTS
  useEffect(() => {
    // Auth Check
    const init = async () => {
      const u = await auth.getCurrentUser();
      setUser(u);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    // Load Admin Data
    const loadData = async () => {
      if (!user || user.email !== ADMIN_EMAIL) return;
      try {
        const [stats, usersList, packsList] = await Promise.all([
          getAdminStats(),
          adminGetAllUsers(),
          getAllPacks() // Reusing getNewPacks logic (all packs sorted by date)
        ]);

        if (stats) setAdminStatsData(stats);
        if (usersList) setUsers(usersList);
        if (packsList) setPacks(packsList);
      } catch (e) {
        console.error("Admin load error", e);
        // Toast is noisy on load, maybe suppress or show concise
        // toast.error("Veriler yüklenemedi");
      }
    };

    if (!loading && user) loadData();
  }, [loading, user]);


  // 3. HANDLERS
  const handleAddCredits = async () => {
    if (!selectedUser || !creditAmount) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount)) return;

    try {
      await adminAddCredits(selectedUser.id, amount);
      toast.success(`${selectedUser.email} hesabına ${amount} kredi eklendi`);

      // Update local state
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, credits: (u.credits || 0) + amount } : u));
      setCreditDialogOpen(false);
    } catch (e) {
      toast.error("Kredi ekleme başarısız");
    }
  };

  const handleTogglePro = async (targetUser: any) => {
    const newStatus = !targetUser.is_pro;
    const confirmMsg = newStatus
      ? `${targetUser.email} kullanıcısını PRO yapmak istiyor musun?`
      : `${targetUser.email} kullanıcısının PRO yetkisini almak istiyor musun?`;

    if (!confirm(confirmMsg)) return;

    try {
      await adminTogglePro(targetUser.id, newStatus);
      toast.success(`Kullanıcı durumu güncellendi: ${newStatus ? 'PRO' : 'Free'}`);

      // Update local state
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, is_pro: newStatus } : u));
    } catch (e) {
      toast.error("Durum güncelleme başarısız");
    }
  };

  // Pack Handlers
  const handleDeletePack = async (packId: string) => {
    if (!confirm("Bu paketi ve içindeki tüm stickerları silmek istediğinize emin misiniz?")) return;
    try {
      await deletePack(packId);
      toast.success("Paket silindi");
      setPacks(packs.filter(p => p.id !== packId));
    } catch (e) {
      toast.error("Silme başarısız");
    }
  };

  const handleRenamePack = async () => {
    if (!editPackId || !editPackTitle) return;
    try {
      await updatePackTitle(editPackId, editPackTitle);
      toast.success("Paket güncellendi");
      setPacks(packs.map(p => p.id === editPackId ? { ...p, title: editPackTitle, name: editPackTitle } : p));
      setEditDialogOpen(false);
    } catch (e) {
      toast.error("Güncelleme başarısız");
    }
  };

  // Upload Logic (Keep existing)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleUpload = async () => {
    if (!user || files.length === 0 || !packTitle) {
      toast.error("Eksik bilgi");
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Yükleniyor...");
    try {
      const res = await createAdminPack(user.id, files, packTitle, publisher, category, isPremium, selectedCoverIndex);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        setFiles([]); setPackTitle("");
        setActiveTab("packs");
      } else {
        toast.error(res.message, { id: toastId });
      }
    } catch (e) {
      toast.error("Hata", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  // 4. RENDER
  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (user?.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;

  const filteredUsers = users.filter(u =>
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPacks = packs.filter(p =>
    (p.title || p.name || "").toLowerCase().includes(packSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-10">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20 p-3 flex justify-between items-center">
        <Link to="/profile" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold">Admin Panel</span>
        </Link>
        <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full font-mono">SUPREME POWER</span>
      </header>



      <main className="p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="glass-card p-3 rounded-xl border border-primary/20">
            <div className="text-xs text-muted-foreground">Paketler</div>
            <div className="text-xl font-black text-primary">{adminStatsData.totalPacks}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-secondary/20">
            <div className="text-xs text-muted-foreground">Kullanıcılar</div>
            <div className="text-xl font-black text-secondary">{adminStatsData.totalUsers}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-accent/20">
            <div className="text-xs text-muted-foreground">Stickerlar</div>
            <div className="text-xl font-black text-accent">{adminStatsData.totalStickers}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-teal-500/20">
            <div className="text-xs text-muted-foreground">Gelir</div>
            <div className="text-xl font-black text-teal-500">₺0</div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Genel</TabsTrigger>
            <TabsTrigger value="users">Üyeler</TabsTrigger>
            <TabsTrigger value="packs">Paketler</TabsTrigger>
            <TabsTrigger value="upload">Yükle</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-card p-4 rounded-xl border border-purple-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Bugün</span>
                  <Activity className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-black text-purple-500">
                  {users.filter(u => {
                    const created = new Date(u.created_at);
                    const today = new Date();
                    return created.toDateString() === today.toDateString();
                  }).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Yeni Üye</div>
              </div>

              <div className="glass-card p-4 rounded-xl border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Toplam</span>
                  <Sparkles className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-blue-500">
                  {adminStatsData.totalStickers}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Sticker</div>
              </div>

              <div className="glass-card p-4 rounded-xl border border-amber-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">PRO</span>
                  <Crown className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-500">
                  {users.filter(u => u.is_pro).length}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Üye</div>
              </div>

              <div className="glass-card p-4 rounded-xl border border-green-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Ortalama</span>
                  <Coins className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-black text-green-500">
                  {users.length > 0 ? Math.round(users.reduce((sum, u) => sum + (u.credits || 0), 0) / users.length) : 0}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Kredi/Kişi</div>
              </div>
            </div>

            {/* Recent Users & Popular Packs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Recent Users */}
              <div className="glass-card rounded-xl border border-border/20 p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Son Kayıtlar
                </h3>
                <div className="space-y-2">
                  {users.slice(0, 5).map(u => (
                    <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-xs font-bold">
                        {u.email?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{u.name || "İsimsiz"}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                      {u.is_pro && <Crown className="w-3 h-3 text-amber-500" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Popular Packs */}
              <div className="glass-card rounded-xl border border-border/20 p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-secondary" />
                  Popüler Paketler
                </h3>
                <div className="space-y-2">
                  {packs
                    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
                    .slice(0, 5)
                    .map(p => (
                      <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                        <img
                          src={p.tray_image_url || p.stickers?.[0]?.image_url || "/placeholder.png"}
                          className="w-8 h-8 rounded-md object-cover"
                          alt=""
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold truncate">{p.title || p.name}</div>
                          <div className="text-[10px] text-muted-foreground">{p.downloads || 0} indirme</div>
                        </div>
                        {p.is_premium && <Crown className="w-3 h-3 text-amber-400" />}
                      </div>
                    ))}
                  {packs.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-4">Henüz paket yok</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-2">
              <Search className="w-5 h-5 text-muted-foreground absolute translate-x-3 translate-y-2.5" />
              <Input
                placeholder="Kullanıcı ara (email, isim)..."
                className="pl-10 h-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="glass-card rounded-2xl border border-border/20 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto divide-y divide-border/10">
                {filteredUsers.map(u => (
                  <div key={u.id} className="p-4 flex items-center justify-between hover:bg-muted/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-xs ring-2 ring-border">
                        {u.email?.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground">{u.name || "İsimsiz"}</p>
                          {u.is_pro && <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-lg text-secondary inline-flex items-center gap-1">
                          <Coins className="w-3 h-3" /> {u.credits}
                        </p>
                        <p className="text-[9px] text-muted-foreground">Kredi</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 rounded-lg border-green-500/30 text-green-500 hover:bg-green-500/10"
                          onClick={() => { setSelectedUser(u); setCreditDialogOpen(true); }}
                          title="Kredi Ekle"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className={cn(
                            "h-8 w-8 rounded-lg",
                            u.is_pro ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-border text-muted-foreground"
                          )}
                          onClick={() => handleTogglePro(u)}
                          title={u.is_pro ? "Pro yetkisini al" : "Pro yap"}
                        >
                          <Crown className="w-4 h-4" />
                        </Button>

                      </div>
                    </div>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">Kullanıcı bulunamadı</div>
                )}
              </div>
            </div>
          </TabsContent>


          <TabsContent value="packs" className="mt-3 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Paket ara..."
                  className="pl-9 h-9 text-xs rounded-xl bg-muted/30 border-border/30"
                  value={packSearchQuery}
                  onChange={e => setPackSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="glass-card rounded-xl border border-border/20 overflow-hidden">
              <div className="divide-y divide-border/10 max-h-[450px] overflow-y-auto">
                {filteredPacks.map((pack) => (
                  <div key={pack.id} className="px-3 py-2.5 flex items-center gap-2">
                    <img
                      src={pack.tray_image_url || pack.stickers?.[0]?.image_url || "/placeholder.png"}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border border-border/30 bg-muted/30"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold truncate">{pack.title || pack.name}</span>
                        {pack.is_premium && (
                          <Crown className="w-3 h-3 text-amber-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{pack.publisher || "Admin"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center">
                          <span className="text-[9px] text-secondary">{pack.downloads || 0} ↓</span>
                        </div>
                        <span className="text-[9px] text-muted-foreground">{(pack.stickers || []).length} sticker</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="w-7 h-7"
                        onClick={() => {
                          setEditPackId(pack.id);
                          setEditPackTitle(pack.title || pack.name);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7"
                        onClick={() => handleDeletePack(pack.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {packs.length === 0 && <div className="p-4 text-center text-xs text-muted-foreground">Paket bulunamadı.</div>}
              </div>
            </div>
          </TabsContent>


          <TabsContent value="upload">
            {/* Re-using the Upload UI from before, adapted to new structure */}
            <div className="grid grid-cols-2 gap-4 h-[500px]">
              <div className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 hover:bg-accent/5 transition-colors relative">
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} />
                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="font-bold">Dosyaları Sürükle</p>
                <p className="text-xs text-muted-foreground mb-4">{files.length} dosya seçildi</p>

                {files.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 w-full max-h-40 overflow-y-auto px-2">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className={cn(
                          "aspect-square rounded-md overflow-hidden relative cursor-pointer border-2",
                          selectedCoverIndex === i ? "border-primary" : "border-transparent"
                        )}
                        onClick={(e) => { e.stopPropagation(); setSelectedCoverIndex(i); }}
                      >
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Input placeholder="Paket Adı" value={packTitle} onChange={e => setPackTitle(e.target.value)} />
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} id="prem" />
                  <label htmlFor="prem" className="text-sm font-bold">Premium Paket</label>
                </div>
                <Button className="w-full" onClick={handleUpload} disabled={uploading}>
                  {uploading ? "Yükleniyor..." : "Yayınla"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent aria-describedby="credit-dialog-description">
          <DialogHeader>
            <DialogTitle>Kredi Ekle: {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex gap-2 mb-4">
              {[50, 100, 500, 1000].map(amt => (
                <Button
                  key={amt}
                  variant={creditAmount === amt.toString() ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCreditAmount(amt.toString())}
                >
                  +{amt}
                </Button>
              ))}
            </div>
            <Input
              type="number"
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              placeholder="Miktar girin"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleAddCredits}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Pack Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent aria-describedby="edit-dialog-description">
          <DialogHeader>
            <DialogTitle>Paketi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-xs text-muted-foreground mb-1 block">Paket Başlığı</label>
            <Input
              value={editPackTitle}
              onChange={e => setEditPackTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRenamePack}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}