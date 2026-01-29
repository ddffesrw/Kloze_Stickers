
import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import {
  ArrowLeft, Package, Users, DollarSign, Upload, Search,
  Plus, Minus, Crown, Sparkles, Activity, MoreVertical, Eye, Trash2,
  Settings, BarChart3, Bell, CheckCircle, Shield, Zap, Coins, Loader2,
  Image as ImageIcon, ShieldAlert, CreditCard, Layers, Edit, X, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { allPacks, aiStyles, promptModifiers, generateFinalPrompt, translatePrompt } from "@/data/mockData";
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
  getNewStickerPacks as getAllPacks,
  deleteStickerPack as deletePack,
  updatePackTitle
} from "@/services/stickerPackService";
import {
  generateStickerHF,
  getForgeModels,
  getForgeCurrentModel,
  setForgeModel
} from "@/services/forgeService";
import { removeBackgroundWithRetry } from "@/services/backgroundRemovalService";
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

  // AI Generate State
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiRemoveBg, setAiRemoveBg] = useState(true);

  // Model State
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState("");
  const [changingModel, setChangingModel] = useState(false);

  // Bulk Gen State
  const [bulkPrompt, setBulkPrompt] = useState("");
  const [bulkQuantity, setBulkQuantity] = useState(0); // Default to 0 as requested
  const [selectedStyle, setSelectedStyle] = useState("3d"); // Style State
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ id: string, imageURL: string, seed: number, loading?: boolean, blob?: Blob }[]>([]);
  const [bulkPackTitle, setBulkPackTitle] = useState("");
  const [bulkCategory, setBulkCategory] = useState("Sanat");
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(["masterpiece", "sharpFocus"]); // Default modifiers

  // Generation Progress Modal State
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<{ index: number, status: 'pending' | 'generating' | 'done' | 'error' | 'cancelled' }[]>([]);
  const cancelGenerationRef = useRef(false);

  // 2. EFFECTS
  useEffect(() => {
    // Auth Check
    const init = async () => {
      const u = await auth.getCurrentUser();
      setUser(u);
      setLoading(false);

      // Load Initial Models (Fire and forget)
      loadModels();
    };
    init();
  }, []);

  const loadModels = async () => {
    const models = await getForgeModels();
    setAvailableModels(models);
    const current = await getForgeCurrentModel();
    setCurrentModel(current);
  };

  const handleModelChange = async (newModel: string) => {
    if (!newModel || newModel === currentModel) return;
    setChangingModel(true);
    const success = await setForgeModel(newModel);
    if (success) {
      setCurrentModel(newModel);
      toast.success(`Model değiştirildi: ${newModel}`);
    } else {
      toast.error("Model değiştirilemedi");
    }
    setChangingModel(false);
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

  const handleAIGenerate = async () => {
    if (!user || !aiPrompt.trim()) {
      toast.error("Lütfen bir prompt girin");
      return;
    }
    setAiGenerating(true);
    const toastId = toast.loading("AI sticker oluşturuluyor...");
    try {
      const result = await generateStickerHF({ prompt: aiPrompt });
      toast.success("Sticker oluşturuldu!", { id: toastId });
      setAiResult(result.imageURL || null);
      setAiPrompt("");
    } catch (e: any) {
      toast.error(e?.message || "Oluşturma başarısız", { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!bulkPrompt.trim()) return;
    if (bulkQuantity <= 0) {
      toast.error("Lütfen üretilecek adet girin");
      return;
    }

    // Reset cancel flag
    cancelGenerationRef.current = false;

    // Setup progress tracking
    const initialProgress = Array.from({ length: bulkQuantity }, (_, i) => ({
      index: i,
      status: 'pending' as const
    }));
    setGenerationProgress(initialProgress);
    setProgressModalOpen(true);
    setBulkGenerating(true);

    // Create copy for safe updating
    let currentResults: { id: string, imageURL: string, seed: number }[] = [];

    // Prompt Enhancer using new Modifier System
    const selectedStyleObj = aiStyles.find(s => s.id === selectedStyle);
    const stylePrompt = selectedStyleObj ? selectedStyleObj.prompt : "";

    // TRANSLATE Turkish prompt to English first
    const translatedPrompt = translatePrompt(bulkPrompt);
    console.log("🔄 Translated prompt:", bulkPrompt, "→", translatedPrompt);

    // Generate base prompt with modifiers (technical quality keywords)
    const promptWithModifiers = generateFinalPrompt(translatedPrompt, selectedModifiers);

    // Sticker-specific keywords
    const stickerKeywords = "sticker design, vector style, white background, die-cut white border, centered, isolated on white background";

    // Final combined prompt: Translated User + Modifiers + Style + Sticker Keywords
    const fullPrompt = `${promptWithModifiers}, ${stylePrompt}, ${stickerKeywords}`;

    // Loop with delay to avoid instant rate limiting if any
    for (let i = 0; i < bulkQuantity; i++) {
      // Check if cancelled
      if (cancelGenerationRef.current) {
        setGenerationProgress(prev => prev.map((p, idx) =>
          idx >= i ? { ...p, status: 'cancelled' } : p
        ));
        break;
      }

      // Update status to generating
      setGenerationProgress(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'generating' } : p
      ));

      try {
        const res = await generateStickerHF({ prompt: fullPrompt + ` variation ${i} ` });

        // Background Removal Check
        let finalImageUrl = res.imageURL;

        // Track the initial URL from service
        if (res.imageURL.startsWith('blob:')) {
          blobUrlsRef.current.push(res.imageURL);
        }

        let blob = await fetch(res.imageURL).then(r => r.blob());
        let itemBlob = blob; // Default to original

        // Background Removal
        if (aiRemoveBg) {
          try {
            const processedBlob = await removeBackgroundWithRetry(blob);
            finalImageUrl = URL.createObjectURL(processedBlob);
            blobUrlsRef.current.push(finalImageUrl);
            itemBlob = processedBlob; // Use processed blob
          } catch (bgError) {
            console.error("BG Remove failed for bulk item", bgError);
            // Keep original blob if removal fails
          }
        }

        const newsticker = {
          id: crypto.randomUUID(),
          ...res,
          imageURL: finalImageUrl,
          blob: itemBlob // Store actual blob for publish
        };

        currentResults = [...currentResults, newsticker];
        setBulkResults(prev => [...prev, newsticker]);

        // Update status to done
        setGenerationProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'done' } : p
        ));

        // Small delay
        await new Promise(r => setTimeout(r, 500));

      } catch (e) {
        console.error("Bulk Item Error", e);
        // Update status to error
        setGenerationProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error' } : p
        ));
      }
    }
    setBulkGenerating(false);

    if (cancelGenerationRef.current) {
      toast.info(`Üretim durduruldu! ${currentResults.length} sticker üretildi.`);
    } else {
      toast.success(`${currentResults.length}/${bulkQuantity} Sticker üretildi`);
    }
  };

  const handleBulkPublish = async () => {
    if (bulkResults.length === 0 || !bulkPackTitle) return;
    const toastId = toast.loading("Paket oluşturuluyor...");
    setBulkGenerating(true);

    try {
      // 1. Convert URLs to Files
      // 1. Convert URLs to Files
      const filePromises = bulkResults.map(async (item, idx) => {
        let blob = item.blob;
        if (!blob) {
          // Fallback if no blob stored (old items?)
          const res = await fetch(item.imageURL);
          blob = await res.blob();
        }
        return new File([blob], `sticker_${idx}.webp`, { type: "image/webp" });
      });

      const filesToUpload = await Promise.all(filePromises);

      // 2. Call existing Upload Service
      // For bulk, we reuse 'createAdminPack' which takes File[]
      // We assume they are already 'clean' enough (HF Flux is squareish usually)
      // Note: We are missing background removal here if HF doesn't do it.
      // The implementation plan said "Review -> Delete -> Publish".
      // BG Removal typically happens AFTER generation. 
      // For this specific 'bulk' tool, maybe we skip BG removal or do it on backend?
      // Or we can add a check to remove bg? 
      // Current HF service returns image. 
      // Let's assume for now we publish them as is (user requested bulk gen + publish).
      // If BG removal is needed, it would be very slow to do 20x.

      const res = await createAdminPack(
        user!.id,
        filesToUpload,
        bulkPackTitle,
        "Kloze AI",
        bulkCategory,
        isPremium, // Use the state variable
        0 // cover index
      );

      if (res.success) {
        toast.success(res.message, { id: toastId });
        setBulkResults([]);
        setBulkPackTitle("");
        setActiveTab("packs");
      } else {
        toast.error(res.message, { id: toastId });
      }

    } catch (e) {
      console.error(e);
      toast.error("Paketleme hatası", { id: toastId });
    } finally {
      setBulkGenerating(false);
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
          <TabsList className="w-full grid grid-cols-5 mb-4">
            <TabsTrigger value="overview">Genel</TabsTrigger>
            <TabsTrigger value="users">Üyeler</TabsTrigger>
            <TabsTrigger value="packs">Paketler</TabsTrigger>
            <TabsTrigger value="upload">Yükle</TabsTrigger>
            <TabsTrigger value="ai">AI Üret</TabsTrigger>
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

                {/* Category Selector */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Kategori</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-muted/30 border border-border/30 text-sm"
                  >
                    <option value="Eğlence">😂 Eğlence</option>
                    <option value="Hayvanlar">🐱 Hayvanlar</option>
                    <option value="Aşk">❤️ Aşk</option>
                    <option value="Gaming">🎮 Gaming</option>
                    <option value="Anime">✨ Anime</option>
                    <option value="Meme">🤣 Meme</option>
                    <option value="Müzik">🎵 Müzik</option>
                    <option value="Spor">⚽ Spor</option>
                    <option value="Yemek">🍕 Yemek</option>
                    <option value="Seyahat">✈️ Seyahat</option>
                  </select>
                </div>

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

          <TabsContent value="ai" className="space-y-4">
            <div className="glass-card rounded-xl border border-border/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  AI Sticker Üretici (Hugging Face)
                </h3>
                {bulkGenerating && (
                  <span className="text-xs font-mono text-muted-foreground animate-pulse">
                    Üretiliyor: {bulkResults.length} / {bulkQuantity}
                  </span>
                )}
              </div>

            </div>

            <div className="space-y-4">
              {/* Model & Prompt Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Model Selector */}
                <div className="md:col-span-1">
                  <label className="text-sm text-yellow-500 font-bold mb-2 flex items-center justify-between">
                    <span>Model</span>
                    {changingModel && <Loader2 className="w-3 h-3 animate-spin" />}
                    <button onClick={loadModels} className="text-[10px] text-muted-foreground hover:text-white">Yenile</button>
                  </label>
                  <select
                    value={currentModel}
                    onChange={(e) => handleModelChange(e.target.value)}
                    disabled={changingModel || bulkGenerating}
                    className="w-full h-12 px-3 rounded-lg bg-black/20 border border-yellow-500/30 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  >
                    <option value="" disabled>Model Seç...</option>
                    {availableModels.length > 0 ? (
                      availableModels.map(m => (
                        <option key={m} value={m}>{m.replace('.safetensors', '').substring(0, 20)}...</option>
                      ))
                    ) : (
                      <option value="" disabled>Model bulunamadı (Forge açık mı?)</option>
                    )}
                  </select>
                </div>

                {/* Prompt Input */}
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground mb-2 block">Prompt (İngilizce)</label>
                  <Input
                    placeholder="örn: cute cat with sunglasses"
                    value={bulkPrompt}
                    onChange={e => setBulkPrompt(e.target.value)}
                    disabled={bulkGenerating}
                    className="h-12"
                  />
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Adet</label>
                  <div className="flex flex-col gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="0"
                      value={bulkQuantity === 0 ? "" : bulkQuantity}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === "") {
                          setBulkQuantity(0);
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num >= 0 && num <= 20) {
                            setBulkQuantity(num);
                          }
                        }
                      }}
                      disabled={bulkGenerating}
                      className="h-12 text-center text-lg font-bold"
                    />
                    <div className="flex gap-1 justify-between">
                      {[1, 5, 10, 15, 20].map(n => (
                        <button
                          key={n}
                          onClick={() => setBulkQuantity(n)}
                          disabled={bulkGenerating}
                          className="bg-muted hover:bg-muted/80 text-xs py-1 px-2 rounded border border-border/50 text-muted-foreground transition-colors"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Style Selector */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block">Stil Seç</label>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2">
                  {aiStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      disabled={bulkGenerating}
                      className={cn(
                        "flex-shrink-0 w-20 h-24 rounded-xl p-2 relative overflow-hidden transition-all duration-300 snap-start bg-black/20",
                        "flex flex-col items-center justify-center gap-1",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        selectedStyle === style.id
                          ? "border-2 border-primary/50 bg-primary/10"
                          : "border border-border/30 hover:border-primary/30"
                      )}
                      title={style.description}
                    >
                      <span className="text-2xl">{style.icon}</span>
                      <span className="text-[9px] font-bold text-foreground text-center leading-tight line-clamp-2">{style.name}</span>
                      {selectedStyle === style.id && (
                        <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2 h-2 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Modifiers - Technical Enhancers */}
              <div className="space-y-2">
                <label className="text-sm text-cyan-400 font-bold flex items-center gap-2">
                  🔧 Prompt Modifiers (Teknik Kalite)
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(promptModifiers).map(([key, mod]) => {
                    const isSelected = selectedModifiers.includes(key);
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedModifiers(prev =>
                            isSelected
                              ? prev.filter(k => k !== key)
                              : [...prev, key]
                          );
                        }}
                        disabled={bulkGenerating}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                          "flex items-center gap-1.5 border",
                          isSelected
                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20"
                            : "bg-muted/30 border-border/40 text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-400"
                        )}
                      >
                        <span>{mod.icon}</span>
                        <span>{mod.label}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Seçilen: {selectedModifiers.length} modifier • Stil ile karışmaz
                </p>
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30">
                <div>
                  <p className="text-sm font-medium">Arka Planı Sil</p>
                  <p className="text-xs text-muted-foreground">Şeffaf PNG sticker (Otomatik)</p>
                </div>
                <input
                  type="checkbox"
                  checked={aiRemoveBg}
                  onChange={e => setAiRemoveBg(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                  disabled={bulkGenerating}
                />
              </div>

              <Button
                className="w-full h-12 text-lg"
                onClick={handleBulkGenerate}
                disabled={bulkGenerating || !bulkPrompt.trim()}
              >
                {bulkGenerating ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Oluşturuluyor... ({bulkResults.length})
                  </div>
                ) : (
                  "Üretimi Başlat"
                )}
              </Button>

              {/* Results Grid - Unified View */}
              {bulkResults.length > 0 && (
                <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-bold text-lg">Sonuçlar ({bulkResults.length})</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBulkResults([])}
                      disabled={bulkGenerating}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Tümünü Sil
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4 p-4 rounded-xl border bg-black/20 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {bulkResults.map((res) => (
                      <div key={res.id} className="relative group aspect-square rounded-xl overflow-hidden border border-border/40 bg-muted/5">
                        <img src={res.imageURL} className={cn("w-full h-full object-contain p-1", res.loading && "opacity-50 blur-sm")} alt="Generated" />

                        {res.loading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          {/* View button - larger and primary */}
                          <a
                            href={res.imageURL}
                            target="_blank"
                            className="p-3 bg-primary/90 text-white rounded-full hover:bg-primary transition-colors shadow-lg"
                            title="Büyüt"
                          >
                            <Eye className="w-5 h-5" />
                          </a>
                          {/* Delete button - smaller and requires confirmation */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Bu stickeri silmek istediğinize emin misiniz?')) {
                                setBulkResults(prev => prev.filter(p => p.id !== res.id));
                              }
                            }}
                            className="p-1.5 bg-red-500/70 text-white rounded-full hover:bg-red-600 transition-colors text-xs"
                            title="Sil"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {bulkGenerating && (
                      <div className="aspect-square rounded-xl border border-dashed border-primary/50 flex flex-col items-center justify-center bg-primary/5 animate-pulse">
                        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                        <span className="text-xs text-primary font-mono">Üretiliyor...</span>
                      </div>
                    )}
                  </div>

                  {/* Publish Actions */}
                  <div className="glass-card p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center justify-between">
                          <span>Paket Adı</span>
                          <button
                            type="button"
                            onClick={() => {
                              // Creative pack name generator
                              const words = bulkPrompt.split(" ").filter(w => w.length > 2).slice(0, 2);
                              const styleObj = aiStyles.find(s => s.id === selectedStyle);
                              const styleName = styleObj?.name || "Art";
                              const suffixes = ["Pack", "Collection", "Series", "Set", "Bundle"];
                              const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

                              const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
                              const baseName = words.map(capitalize).join(" ");

                              const generatedName = baseName
                                ? `${baseName} ${styleName} ${suffix}`
                                : `${styleName} Sticker ${suffix}`;

                              setBulkPackTitle(generatedName);
                            }}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            Otomatik İsim
                          </button>
                        </label>
                        <Input
                          placeholder="Örn: Cyber Cats Pack"
                          value={bulkPackTitle}
                          onChange={e => setBulkPackTitle(e.target.value)}
                          className="bg-black/20 border-emerald-500/30 focus-visible:ring-emerald-500/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Kategori</label>
                        <select
                          value={bulkCategory}
                          onChange={e => setBulkCategory(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg bg-black/20 border border-emerald-500/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="Eğlence">😂 Eğlence</option>
                          <option value="Hayvanlar">🐱 Hayvanlar</option>
                          <option value="Aşk">❤️ Aşk</option>
                          <option value="Gaming">🎮 Gaming</option>
                          <option value="Sanat">🎨 Sanat</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                        <input
                          type="checkbox"
                          id="bulkPremium"
                          className="w-4 h-4 accent-orange-500"
                          checked={isPremium}
                          onChange={e => setIsPremium(e.target.checked)}
                        />
                        <label htmlFor="bulkPremium" className="text-xs font-bold text-orange-400 uppercase tracking-wider cursor-pointer flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Premium Paket (Pro Only)
                        </label>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold h-12 shadow-lg shadow-emerald-900/20"
                    onClick={handleBulkPublish}
                    disabled={bulkGenerating || bulkResults.length === 0 || !bulkPackTitle.trim()}
                  >
                    <Package className="w-5 h-5 mr-2" />
                    Paket Olarak Yayınla ({bulkResults.length})
                  </Button>
                </div>
              )}
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

      {/* Generation Progress Modal */}
      <Dialog open={progressModalOpen} onOpenChange={(open) => {
        // Only allow closing when not generating
        if (!bulkGenerating) setProgressModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sticker Üretiliyor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">İlerleme:</span>
              <span className="font-bold">
                {generationProgress.filter(p => p.status === 'done').length} / {generationProgress.length}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${(generationProgress.filter(p => p.status === 'done').length / generationProgress.length) * 100}%`
                }}
              />
            </div>

            {/* Individual Items Grid */}
            <div className="grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto p-2 bg-muted/20 rounded-xl">
              {generationProgress.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all",
                    item.status === 'pending' && "bg-muted/50 text-muted-foreground",
                    item.status === 'generating' && "bg-primary/20 text-primary animate-pulse border-2 border-primary",
                    item.status === 'done' && "bg-green-500/20 text-green-500",
                    item.status === 'error' && "bg-red-500/20 text-red-500",
                    item.status === 'cancelled' && "bg-gray-500/20 text-gray-500"
                  )}
                >
                  {item.status === 'pending' && <span className="opacity-50">{idx + 1}</span>}
                  {item.status === 'generating' && <Loader2 className="w-4 h-4 animate-spin" />}
                  {item.status === 'done' && <CheckCircle className="w-4 h-4" />}
                  {item.status === 'error' && <X className="w-4 h-4" />}
                  {item.status === 'cancelled' && <span className="opacity-50">-</span>}
                </div>
              ))}
            </div>

            {/* Current Status Text */}
            <p className="text-center text-sm text-muted-foreground">
              {bulkGenerating ? (
                <>Sticker #{generationProgress.findIndex(p => p.status === 'generating') + 1} üretiliyor...</>
              ) : (
                <>Tamamlandı!</>
              )}
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            {bulkGenerating ? (
              <Button
                variant="destructive"
                onClick={() => {
                  cancelGenerationRef.current = true;
                  toast.info("Üretim durduruluyor...");
                }}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Durdur
              </Button>
            ) : (
              <Button onClick={() => setProgressModalOpen(false)} className="w-full">
                <CheckCircle className="w-4 h-4 mr-2" />
                Tamam
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}