
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, Package, Users, DollarSign, Upload, Search,
  Plus, Minus, Crown, Sparkles, Activity, MoreVertical, Eye, Trash2,
  Settings, BarChart3, Bell, CheckCircle, Shield, Zap, Coins, Loader2,
  Image as ImageIcon, ShieldAlert, CreditCard, Layers, Edit, X, Check,
  RefreshCw, Flag, Brush
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allPacks } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth, supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import {
  adminGetAllUsers,
  adminAddCredits,
  adminTogglePro
} from "@/services/adminService";
import {
  getAdminStats,
} from "@/services/stickerService";
import {
  createAdminPack,
  getAllStickerPacks as getAllPacks,
  deleteStickerPack as deletePack,
  updatePackDetails,
  getStickerPackById,
  removeStickerFromPack,
  getNextPackName
} from "@/services/stickerPackService";
import { getAllCategories, createCategory, deleteCategory, Category } from "../services/categoryService";


import { getAllReports, updateReportStatus, type Report } from "@/services/reportService";
import { User } from "@supabase/supabase-js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageCropperModal } from "@/components/common/ImageCropperModal";
import { getComfyHistory, getComfyImageBlob, ComfyImage } from "@/services/comfyService";

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
  const [editPackCategory, setEditPackCategory] = useState("");
  const [editPackStickers, setEditPackStickers] = useState<any[]>([]);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Upload State
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [packTitle, setPackTitle] = useState("");
  const [publisher, setPublisher] = useState("Kloze Official");
  const [category, setCategory] = useState("Eğlence");
  const [isPremium, setIsPremium] = useState(false);
  const [uploadRemoveBg, setUploadRemoveBg] = useState(false);
  const [uploadCompress, setUploadCompress] = useState(true); // Default ON
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);

  // Cropper State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);








  // Comfy Bridge State
  const [comfyImages, setComfyImages] = useState<ComfyImage[]>([]);
  const [selectedComfyImages, setSelectedComfyImages] = useState<string[]>([]);
  const [loadingComfy, setLoadingComfy] = useState(false);
  const [comfyUrl, setComfyUrl] = useState("http://127.0.0.1:8188");

  // Moderate/Report State
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Inpainting State
  const [showInpaintingModal, setShowInpaintingModal] = useState(false);
  const [inpaintingTarget, setInpaintingTarget] = useState<{ id: string, imageUrl: string, blob: Blob } | null>(null);
  const [inpaintingPrompt, setInpaintingPrompt] = useState("");

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");

  // 2. EFFECTS
  useEffect(() => {
    // Auth Check
    const init = async () => {
      const u = await auth.getCurrentUser();
      setUser(u);
      setLoading(false);


    };
    init();
  }, [activeTab]); // Trigger when tab changes



  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const data = await getAllReports();
      setReports(data || []);
    } catch (error) {
      console.error("Fetch reports error:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: Report['status']) => {
    try {
      const res = await updateReportStatus(reportId, status);
      if (res.success) {
        toast.success(res.message);
        setReports(reports.map(r => r.id === reportId ? { ...r, status } : r));
      } else {
        toast.error(res.message);
      }
    } catch (error) {
      toast.error("İşlem başarısız");
    }
  };

  const handleActionReport = async (report: Report, action: 'resolve' | 'dismiss' | 'delete_content') => {
    if (action === 'delete_content' && report.reported_pack_id) {
      if (confirm("Bu paketi tamamen silmek istediğine emin misin?")) {
        await deletePack(report.reported_pack_id);
        toast.success("Paket silindi");
        handleUpdateReportStatus(report.id, 'resolved');
        // Refresh packs list
        const packsList = await getAllPacks();
        if (packsList) setPacks(packsList);
      }
      return;
    }

    handleUpdateReportStatus(report.id, action === 'resolve' ? 'resolved' : 'dismissed');
  };

  // 3. HANDLERS
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);

      // If single file selected, trigger cropper
      // (User requested zoom/pan/crop capability for mobile)
      if (selectedFiles.length === 1) {
        const file = selectedFiles[0];
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setCropImageSrc(reader.result?.toString() || null);
          setPendingCropFile(file);
          setCropModalOpen(true);
        });
        reader.readAsDataURL(file);
        // Clear input so same file can be selected again if cancelled
        e.target.value = "";
        return;
      }

      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Add the cropped blob as a file
    const originalName = pendingCropFile?.name || "sticker.webp";
    const file = new File([croppedBlob], originalName, { type: "image/webp" });
    setFiles(prev => [...prev, file]);

    // Cleanup
    setCropImageSrc(null);
    setPendingCropFile(null);
  };

  const fetchComfyHistory = async () => {
    setLoadingComfy(true);
    try {
      const history = await getComfyHistory(20, comfyUrl); // Fetch last 20 generations with custom URL
      setComfyImages(history);
      // Data format check
      if (history.length === 0) toast.info("ComfyUI geçmişi boş veya bağlantı yok");
    } catch (e) {
      toast.error("ComfyUI bağlanamadı. URL'yi kontrol et ve --enable-cors-header * ile başlattığından emin ol.");
    } finally {
      setLoadingComfy(false);
    }
  };

  const handleComfyImport = async () => {
    if (selectedComfyImages.length === 0) return;

    setLoadingComfy(true);
    try {
      const newFiles: File[] = [];

      for (const id of selectedComfyImages) {
        const img = comfyImages.find(i => i.id === id);
        if (img) {
          const blob = await getComfyImageBlob(img);
          const file = new File([blob], img.filename, { type: "image/png" });
          newFiles.push(file);
        }
      }

      setFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} görsel içe aktarıldı! "Yayınla" butonuyla paketi oluşturabilirsin.`);

      // Auto-switch to upload tab
      setActiveTab("upload");

      // Clear selection
      setSelectedComfyImages([]);
    } catch (e) {
      toast.error("Görseller alınamadı");
    } finally {
      setLoadingComfy(false);
    }
  };

  // Track blob URLs for cleanup to avoid memory leaks
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup all created blob URLs on unmount
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    // Load Admin Data
    const loadData = async () => {
      if (!user || user.email !== ADMIN_EMAIL) return;
      try {
        const [stats, usersList, packsList, reportsList, categoriesResult] = await Promise.all([
          getAdminStats(),
          adminGetAllUsers(),
          getAllPacks(),
          getAllReports(),
          getAllCategories()
        ]);

        if (stats) setAdminStatsData(stats);
        if (usersList) setUsers(usersList);
        if (packsList) setPacks(packsList);
        if (reportsList) setReports(reportsList);
        if (categoriesResult) setCategories(categoriesResult);

        // Init Auto-Name if categories loaded and categories exist (Targeting Upload Tab now)
        if (categoriesResult && categoriesResult.length > 0 && !packTitle) {
          const firstCat = categoriesResult[0].name;
          setCategory(firstCat);
          getNextPackName(firstCat).then(name => setPackTitle(name));
        }

      } catch (e) {
        console.error("Admin load error", e);
      }
    };

    if (!loading && user) loadData();
  }, [loading, user]);

  // Auto-Name Effect when Category Changes (Upload Tab)
  useEffect(() => {
    if (category) {
      getNextPackName(category).then(name => setPackTitle(name));
    }
  }, [category]);


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
      ? `${targetUser.email} kullanıcısını PRO yapmak istiyor musun ? `
      : `${targetUser.email} kullanıcısının PRO yetkisini almak istiyor musun ? `;

    if (!confirm(confirmMsg)) return;

    try {
      await adminTogglePro(targetUser.id, newStatus);
      toast.success(`Kullanıcı durumu güncellendi: ${newStatus ? 'PRO' : 'Free'} `);

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

  const handleUpdatePack = async () => {
    if (!editPackId || !editPackTitle) return;
    try {
      await updatePackDetails(editPackId, editPackTitle, editPackCategory);
      toast.success("Paket güncellendi");
      setPacks(packs.map(p => p.id === editPackId ? { ...p, title: editPackTitle, name: editPackTitle, category: editPackCategory } : p));
      setEditDialogOpen(false);
    } catch (e) {
      toast.error("Güncelleme başarısız");
    }
  };

  const handleRemoveSticker = async (stickerId: string) => {
    if (!editPackId) return;
    try {
      if (!confirm("Bu sticker'ı paketten çıkarmak istediğinize emin misiniz?")) return;

      await removeStickerFromPack(stickerId, editPackId);

      // Update local state by filtering out the removed sticker
      setEditPackStickers(prev => prev.filter(s => s.id !== stickerId));

      toast.success("Sticker paketten çıkarıldı");

      // We don't force a full pack refresh to keep it snappy, 
      // but strictly speaking we should maybe decrement sticker count in main list.
      // Not critical for now.
    } catch (e) {
      console.error(e);
      toast.error("Sticker silinemedi");
    }
  };

  const openEditDialog = async (pack: any) => {
    setEditPackId(pack.id);
    setEditPackTitle(pack.name || pack.title);
    setEditPackCategory(pack.category || "Genel");
    setEditPackStickers([]); // Clear previous
    setEditDialogOpen(true);
    setLoadingEdit(true);

    try {
      const fullPack = await getStickerPackById(pack.id);
      if (fullPack && fullPack.stickers) {
        setEditPackStickers(fullPack.stickers);
      }
    } catch (e) {
      toast.error("Paket içeriği yüklenemedi");
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleTogglePackPremium = async (packId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
      const { error } = await supabase.from('sticker_packs').update({ is_premium: newStatus }).eq('id', packId);
      if (error) throw error;
      toast.success(newStatus ? "Paket Pro Olarak İşaretlendi" : "Paket Herkese Açıldı");
      setPacks(packs.map(p => p.id === packId ? { ...p, is_premium: newStatus } : p));
    } catch (e) {
      toast.error("Durum güncellenemedi");
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
    const toastId = toast.loading("Yükleniyor" + (uploadRemoveBg ? " ve arka plan temizleniyor..." : "..."));
    try {
      const res = await createAdminPack(user.id, files, packTitle, publisher, category, isPremium, selectedCoverIndex, uploadRemoveBg, uploadCompress);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        // Refresh packs
        const updatedPacks = await getAllPacks();
        setPacks(updatedPacks || []);

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
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto p-1 bg-muted/20 mb-6 rounded-2xl gap-1">
            <TabsTrigger value="overview">Genel</TabsTrigger>
            <TabsTrigger value="users">Üyeler</TabsTrigger>
            <TabsTrigger value="packs">Paketler</TabsTrigger>
            <TabsTrigger value="upload">Yükle</TabsTrigger>

            <TabsTrigger value="comfy">ComfyUI</TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              Raporlar
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[10px] text-white flex items-center justify-center rounded-full font-bold animate-pulse">
                  {reports.filter(r => r.status === 'pending').length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Settings className="w-4 h-4" />
              Kategoriler
            </TabsTrigger>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "w-7 h-7",
                          pack.is_premium ? "text-amber-500" : "text-muted-foreground"
                        )}
                        onClick={() => handleTogglePackPremium(pack.id, pack.is_premium)}
                        title={pack.is_premium ? "Pro'dan Çıkar" : "Pro Yap"}
                      >
                        <Crown className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7"
                        onClick={() => openEditDialog(pack)}
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
                <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileSelect} />
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
                <Input placeholder="Yayıncı (Publisher)" value={publisher} onChange={e => setPublisher(e.target.value)} />

                {/* Category Selector */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border/30 text-sm"
                  >
                    {categories.length > 0 ? (
                      categories.map(c => (
                        <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                      ))
                    ) : (
                      <option value="Genel">📂 Genel</option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} id="prem" />
                  <label htmlFor="prem" className="text-sm font-bold">Premium Paket</label>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                  <input
                    type="checkbox"
                    id="removeBgUpload"
                    className="w-4 h-4 accent-orange-500"
                    checked={uploadRemoveBg}
                    onChange={e => setUploadRemoveBg(e.target.checked)}
                  />
                  <label htmlFor="removeBgUpload" className="text-xs font-bold text-orange-400 cursor-pointer flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Arka Planı Sil (Yavaş)
                  </label>
                </div>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <input
                    type="checkbox"
                    id="compressUpload"
                    className="w-4 h-4 accent-blue-500"
                    checked={uploadCompress}
                    onChange={e => setUploadCompress(e.target.checked)}
                  />
                  <label htmlFor="compressUpload" className="text-xs font-bold text-blue-400 cursor-pointer flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    Otomatik Sıkıştır (Hızlı & Az Yer)
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setFiles([])} disabled={files.length === 0}>
                    Temizle
                  </Button>
                  <Button className="flex-[2]" onClick={handleUpload} disabled={uploading}>
                    {uploading ? "Yükleniyor..." : "Yayınla"}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>



          <TabsContent value="comfy" className="space-y-4">
            <div className="glass-card rounded-xl border border-border/20 p-6">
              {/* Connection Settings */}
              <div className="flex items-center gap-2 mb-6 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <div className="flex-1">
                  <label className="text-xs font-bold text-yellow-500 block mb-1">ComfyUI URL</label>
                  <div className="flex gap-2">
                    <Input
                      value={comfyUrl}
                      onChange={(e) => setComfyUrl(e.target.value)}
                      className="bg-black/20 border-yellow-500/20 text-xs font-mono"
                      placeholder="http://127.0.0.1:8188"
                    />
                    <Button onClick={fetchComfyHistory} disabled={loadingComfy} variant="outline" className="border-yellow-500/20 hover:bg-yellow-500/10">
                      {loadingComfy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Bağlan & Çek
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Telefondan bağlanıyorsan bilgisayarın yerel IP adresini gir (örn: http://192.168.1.35:8188)
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Son Üretilenler
                  </h3>
                </div>
              </div>

              {/* Grid */}
              {comfyImages.length > 0 ? (
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                  {comfyImages.map((img) => (
                    <div
                      key={img.id}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden relative cursor-pointer border-2 transition-all",
                        selectedComfyImages.includes(img.id) ? "border-yellow-400 ring-2 ring-yellow-400/20" : "border-transparent opacity-70 hover:opacity-100"
                      )}
                      onClick={() => {
                        if (selectedComfyImages.includes(img.id)) {
                          setSelectedComfyImages(prev => prev.filter(id => id !== img.id));
                        } else {
                          setSelectedComfyImages(prev => [...prev, img.id]);
                        }
                      }}
                    >
                      <img src={img.url} className="w-full h-full object-cover" />
                      {selectedComfyImages.includes(img.id) && (
                        <div className="absolute top-1 right-1 bg-yellow-400 text-black rounded-full p-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-black/20 rounded-xl mb-4">
                  <p className="text-muted-foreground">Henüz görsel çekilmedi.</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">ComfyUI'ın açık ve --enable-cors-header * ile başladığından emin ol.</p>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex justify-end gap-3 sticky bottom-4 bg-background/80 p-4 backdrop-blur-md rounded-xl border border-border/20 shadow-xl z-10 transition-all transform translate-y-0">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm font-bold text-yellow-400">{selectedComfyImages.length}</span>
                  <span className="text-xs text-muted-foreground">görsel seçildi</span>
                  {selectedComfyImages.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedComfyImages(comfyImages.map(i => i.filename))} className="text-xs h-6">
                      Hepsini Seç
                    </Button>
                  )}
                </div>

                <Button
                  onClick={handleComfyImport}
                  disabled={selectedComfyImages.length === 0 || loadingComfy}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                >
                  {loadingComfy ? "İşleniyor..." : "Seçilenleri İçe Aktar & Düzenle"}
                  <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-2">
                <Flag className="w-6 h-6 text-destructive" />
                Moderasyon Kuyruğu
              </h2>
              <Button variant="outline" size="sm" onClick={fetchReports} disabled={loadingReports}>
                <RefreshCw className={cn("w-4 h-4 mr-2", loadingReports && "animate-spin")} />
                Yenile
              </Button>
            </div>

            <div className="glass-card rounded-xl border border-border/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/30">
                      <th className="p-4 text-left font-bold">Raporlanan</th>
                      <th className="p-4 text-left font-bold">Sebep</th>
                      <th className="p-4 text-left font-bold">Durum</th>
                      <th className="p-4 text-left font-bold">Tarih</th>
                      <th className="p-4 text-right font-bold">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/10">
                    {reports.length > 0 ? (
                      reports.map((report) => (
                        <tr key={report.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              {report.reported_pack ? (
                                <>
                                  <img src={report.reported_pack.tray_image_url} className="w-10 h-10 rounded-lg object-contain bg-black/20" />
                                  <div>
                                    <p className="font-bold">{report.reported_pack.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase">Paket</p>
                                  </div>
                                </>
                              ) : report.reported_user ? (
                                <div>
                                  <p className="font-bold">{report.reported_user.email}</p>
                                  <p className="text-[10px] text-muted-foreground uppercase">Kullanıcı</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Bilinmiyor</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <span className="font-bold px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] uppercase">
                                {report.reason}
                              </span>
                              {report.description && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate" title={report.description}>
                                  {report.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                              report.status === 'pending' ? "bg-yellow-500/20 text-yellow-500 animate-pulse" :
                                report.status === 'resolved' ? "bg-green-500/20 text-green-500" :
                                  "bg-muted text-muted-foreground"
                            )}>
                              {report.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {new Date(report.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {report.status === 'pending' && (
                                <>
                                  {report.reported_pack_id && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="h-8 text-[10px] font-bold"
                                      onClick={() => handleActionReport(report, 'delete_content')}
                                    >
                                      SİL
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold border-green-500/30 text-green-500 hover:bg-green-500/10"
                                    onClick={() => handleActionReport(report, 'resolve')}
                                  >
                                    ÇÖZÜLDÜ
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold"
                                    onClick={() => handleActionReport(report, 'dismiss')}
                                  >
                                    YOK SAY
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Raporlanmış içerik bulunmuyor. Harikasınız! 🌟
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="glass-card p-6 rounded-xl border border-border/20">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Kategori Yönetimi
              </h3>

              <div className="flex gap-4 mb-6 items-end">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium">Kategori Adı</label>
                  <Input
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    placeholder="Örn: Doğa"
                  />
                </div>
                <div className="space-y-2 w-24">
                  <label className="text-sm font-medium">Emoji</label>
                  <Input
                    value={newCatEmoji}
                    onChange={e => setNewCatEmoji(e.target.value)}
                    placeholder="🌿"
                    className="text-center text-xl"
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!newCatName || !newCatEmoji) return toast.error("Eksik bilgi");
                    try {
                      const cat = await createCategory(newCatName, newCatEmoji);
                      if (cat) {
                        setCategories([...categories, cat]);
                        setNewCatName(""); setNewCatEmoji("");
                        toast.success("Kategori eklendi");
                      }
                    } catch (e) { toast.error("Hata"); }
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Ekle
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {categories.map(cat => (
                  <div key={cat.id} className="p-3 border rounded-lg flex items-center justify-between bg-muted/20">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={async () => {
                        if (!confirm(`${cat.name} silinsin mi?`)) return;
                        await deleteCategory(cat.id);
                        setCategories(categories.filter(c => c.id !== cat.id));
                        toast.success("Silindi");
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
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
          <div className="py-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Paket Başlığı</label>
              <Input
                value={editPackTitle}
                onChange={e => setEditPackTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
              <select
                value={editPackCategory}
                onChange={e => setEditPackCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border/30 text-sm"
              >
                {categories.length > 0 ? (
                  categories.map(c => (
                    <option key={c.id} value={c.name}>{c.emoji} {c.name}</option>
                  ))
                ) : (
                  <option value="Genel">📂 Genel</option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block font-bold">Stickerlar ({editPackStickers.length})</label>
              {loadingEdit ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto p-2 bg-muted/20 rounded-lg">
                  {editPackStickers.map((s) => (
                    <div key={s.id} className="relative aspect-square group rounded-md overflow-hidden bg-black/20">
                      <img src={s.image_url} className="w-full h-full object-cover" />

                      <div className="absolute top-1 right-1">
                        <Button
                          variant="destructive"
                          size="icon"
                          className="w-6 h-6 rounded-full shadow-md opacity-90 hover:opacity-100"
                          onClick={(e) => { e.stopPropagation(); handleRemoveSticker(s.id); }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {editPackStickers.length === 0 && (
                    <div className="col-span-4 text-center py-4 text-xs text-muted-foreground">
                      Bu pakette sticker yok.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdatePack}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        onClose={() => {
          setCropModalOpen(false);
          setPendingCropFile(null);
          setCropImageSrc(null);
        }}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
      />

    </div>
  );
}