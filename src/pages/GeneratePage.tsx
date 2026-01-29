import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Coins, RotateCcw, Wand2, Zap, Check, AlertCircle, Loader2, Crown, Play, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { aiStyles } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useStickerGeneration } from "@/hooks/useStickerGeneration";
import { auth, supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { getDraftStickers, type Sticker } from "@/services/stickerService";
import { createStickerPack, type StickerPack } from "@/services/stickerPackService";
import { downloadWhatsAppPack, downloadAllStickers } from "@/services/whatsappService";
import { Package, X, CheckCircle, Share2, Copy, Download, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdMob, RewardAdPluginEvents, AdMobRewardItem } from "@capacitor-community/admob";
import { Capacitor } from "@capacitor/core";
import { GenerationProgressModal } from "@/components/kloze/GenerationProgressModal";
import { NoCreditModal } from "@/components/kloze/NoCreditModal";

// Background Removal Options
type BgRemovalOption = 'off' | 'pro' | 'credit' | 'ad';

export default function GeneratePage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("3d");
  const [removeBackground, setRemoveBackground] = useState(true);
  const [generatedStickers, setGeneratedStickers] = useState<any[]>([]);

  // Pro Status
  const [isPro, setIsPro] = useState(false);

  // BG Removal Modal
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgRemovalUnlocked, setBgRemovalUnlocked] = useState(false); // Unlocked for this session via ad
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // Sticker Pool & Packaging
  const [drafts, setDrafts] = useState<Sticker[]>([]);
  const [selectedStickerIds, setSelectedStickerIds] = useState<Set<string>>(new Set());
  const [isPackCreating, setIsPackCreating] = useState(false);

  const [createdPack, setCreatedPack] = useState<StickerPack | null>(null);
  const [createdPackStickers, setCreatedPackStickers] = useState<Sticker[]>([]);

  // Generation Progress Modal State
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);

  // No Credit Modal State
  const [showNoCreditModal, setShowNoCreditModal] = useState(false);
  const [pendingProvider, setPendingProvider] = useState<'runware' | 'huggingface' | 'dalle' | null>(null);

  // Sticker generation hook (MOTOR BAĞLANTISI)
  const {
    generate,
    isGenerating,
    progress,
    error,
    credits,
    hasEnoughCredits,
    refreshCredits,
    resetError
  } = useStickerGeneration(userId);

  // User ID ve Pro Status al
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);

        // Check Pro status from profiles table
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', user.id)
          .single();

        setIsPro(profile?.is_pro || false);
      }
    };
    getCurrentUser();
  }, []);

  // Fetch Drafts
  const fetchDrafts = async () => {
    if (!userId) return;
    try {
      const data = await getDraftStickers(userId);
      setDrafts(data);
    } catch (error) {
      console.error("Error fetching drafts:", error);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [userId, isGenerating]); // Re-fetch when user changes or generation ends

  // Credits'i refresh et
  useEffect(() => {
    if (userId) {
      refreshCredits();
    }
  }, [userId, refreshCredits]);

  /**
   * HANDLE GENERATE - MOTOR TETİKLEME
   */
  // MOTOR TETİKLE (GENERIC)
  const handleGenerate = async (provider: 'runware' | 'huggingface' | 'dalle') => {
    if (!prompt.trim()) {
      toast.error("Lütfen bir prompt girin");
      return;
    }

    // Kredi kontrolü
    let requiredCredits = 1;
    if (provider === 'runware') requiredCredits = 3;
    if (provider === 'dalle') requiredCredits = 5;

    // Pro Lock Check for DALL-E
    if (provider === 'dalle' && !isPro) {
      setShowBgModal(true); // Re-use BG modal or better, create a specific Pro Modal or redirect
      // For quick implementation, let's redirect to subscription page or show toast
      toast.info("DALL-E modeli sadece PRO üyeler içindir.");
      navigate('/profile'); // Assuming profile has subscription options
      return;
    }

    if (credits < requiredCredits) {
      setPendingProvider(provider);
      setShowNoCreditModal(true);
      return;
    }

    // Show progress modal
    setShowProgressModal(true);
    setGenerationComplete(false);

    // PROMPT ENHANCER
    const selectedStyleObj = aiStyles.find(s => s.id === selectedStyle);
    const stylePrompt = selectedStyleObj ? `, ${selectedStyleObj.prompt}` : "";
    const coreKeywords = ", sticker design, vector style, white background, die-cut white border, centered, isolated on white background, high quality, masterpiece";
    const fullPrompt = `${prompt}${stylePrompt}${coreKeywords}`;

    // MOTOR TETİKLE
    const result = await generate(fullPrompt, provider, removeBackground);

    console.log('Generate successful, result:', result);

    if (result) {
      // Başarılı - mark complete and add to grid
      setGenerationComplete(true);
      setGeneratedStickers(prev => [result, ...prev]);
      // Refresh drafts after successful generation
      fetchDrafts();
    } else if (error) {
      setShowProgressModal(false);
      toast.error(error);
    }
  };

  // Close progress modal after completion animation
  const handleProgressComplete = () => {
    setShowProgressModal(false);
    setGenerationComplete(false);
    toast.success("Sticker başarıyla oluşturuldu! 🎉");
  };

  const handleShare = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast.success("Link kopyalandı! Arkadaşına gönder 🚀");
  };

  /**
   * SELECTION & PACKAGING
   */
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedStickerIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStickerIds(newSet);
  };

  const handleCreatePack = async () => {
    if (selectedStickerIds.size < 3) {
      toast.error("Paket oluşturmak için en az 3 sticker seçmelisin.");
      return;
    }

    setIsPackCreating(true);
    try {
      const title = `My Pack #${Math.floor(Math.random() * 1000)}`;
      // Use the first selected sticker as tray image
      const firstStickerId = Array.from(selectedStickerIds)[0];
      const firstSticker = drafts.find(s => s.id === firstStickerId);

      const publisher = "Kloze User";

      const stickersToPack = drafts.filter(s => selectedStickerIds.has(s.id));
      // Sort logic if needed, but drafts are already sorted. Keep selection order? 
      // Current array from Set is arbitrary order. Better to filter drafts to keep date order.

      const newPack = await createStickerPack(
        userId,
        title,
        publisher,
        Array.from(selectedStickerIds),
        firstSticker?.image_url || ""
      );

      if (newPack) {
        setCreatedPack(newPack);
        setCreatedPackStickers(stickersToPack);

        toast.success("Paket hazır! Tray icon oluşturuldu (96x96).");
        setSelectedStickerIds(new Set());
        fetchDrafts();
      }

    } catch (e) {
      toast.error("Paket oluşturulurken hata oluştu.");
      console.error(e);
    } finally {
      setIsPackCreating(false);
    }
  };

  const getFullPrompt = () => {
    // Style'ı prompt'a ekle
    const selectedStyleObj = aiStyles.find(s => s.id === selectedStyle);
    const stylePrompt = selectedStyleObj?.prompt || "";

    // Combine user prompt with style prompt
    const fullPrompt = `${prompt}, ${stylePrompt}, sticker style`;

    return fullPrompt;
  };

  const handleReset = () => {
    setPrompt("");
    setGeneratedStickers([]);
    resetError();
  };

  /**
   * Handle Background Removal Toggle
   * PRO users: Free, Others: Show modal for Credit/Ad options
   */
  const handleBgToggle = (checked: boolean) => {
    if (!checked) {
      // Turning off is always free
      setRemoveBackground(false);
      return;
    }

    // Turning on - check if user can use it
    if (isPro || bgRemovalUnlocked) {
      // PRO or already unlocked via ad this session
      setRemoveBackground(true);
    } else {
      // Show modal for payment options
      setShowBgModal(true);
    }
  };

  /**
   * Pay 1 Credit for BG Removal
   */
  const handlePayCredit = async () => {
    if (credits < 1) {
      setShowBgModal(false);
      setShowNoCreditModal(true);
      return;
    }

    try {
      // Deduct 1 credit
      const { error } = await supabase.rpc('deduct_credits', { amount: 1 });
      if (error) throw error;

      await refreshCredits();
      setRemoveBackground(true);
      setShowBgModal(false);
      toast.success("Arka plan silme aktif! (-1 kredi)");
    } catch (e) {
      toast.error("Kredi düşürülemedi");
    }
  };

  /**
   * Watch Ad for Free BG Removal
   */
  const handleWatchAd = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Web'de simüle et
      toast.info("Reklam izleniyor... (Simülasyon)");
      await new Promise(r => setTimeout(r, 2000));
      setBgRemovalUnlocked(true);
      setRemoveBackground(true);
      setShowBgModal(false);
      toast.success("Arka plan silme bu oturum için ücretsiz!");
      return;
    }

    setIsWatchingAd(true);

    try {
      // Prepare reward ad
      await AdMob.prepareRewardVideoAd({
        adId: 'ca-app-pub-3940256099942544/5224354917' // Test ID, replace with real one
      });

      // Listen for reward
      const rewardListener = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (reward: AdMobRewardItem) => {
          console.log('Reward received:', reward);
          setBgRemovalUnlocked(true);
          setRemoveBackground(true);
          setShowBgModal(false);
          toast.success("Arka plan silme bu oturum için ücretsiz!");
        }
      );

      // Show ad
      await AdMob.showRewardVideoAd();

      // Cleanup listener after ad closes
      setTimeout(() => rewardListener.remove(), 5000);

    } catch (error) {
      console.error('Ad error:', error);
      toast.error("Reklam yüklenemedi. Daha sonra tekrar deneyin.");
    } finally {
      setIsWatchingAd(false);
    }
  };



  // Progress percentage
  const progressPercentage = progress?.progress || 0;



  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background */}
      <div className="fixed inset-0 mesh-gradient-intense opacity-40 pointer-events-none" />

      {/* Animated Orbs */}
      <div className="fixed top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/20 blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/20 blur-[100px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '1s' }} />

      {/* Header - CANLI KREDİ GÖSTERGESİ */}
      <header className="sticky top-0 z-40 glass-card border-b border-border/20">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl gradient-primary flex items-center justify-center glow-violet animate-pulse-glow">
              <Wand2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-black gradient-text">LAB</h1>
              <p className="text-[10px] text-muted-foreground -mt-1">AI Sticker Üretici</p>
            </div>
          </div>

          {/* CANLI KREDİ */}
          <Link to="/credits">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl glass-card border transition-all hover:bg-muted/20",
              hasEnoughCredits ? "border-secondary/30" : "border-destructive/30"
            )}>
              <Coins className={cn(
                "w-4 h-4",
                hasEnoughCredits ? "text-secondary" : "text-destructive"
              )} />
              <span className={cn(
                "font-bold",
                hasEnoughCredits ? "text-secondary" : "text-destructive"
              )}>
                {credits === null ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  credits
                )}
              </span>
            </div>
          </Link>
        </div>
      </header>

      <main className="relative z-10 p-4 space-y-6">
        {/* Yetersiz Kredi Uyarısı */}
        {credits !== null && !hasEnoughCredits && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Krediniz bitti! Pro üyeliğe geçin veya kredi satın alın.</span>
              <Link to="/credits">
                <Button variant="outline" size="sm" className="h-7 border-white/20 text-white hover:bg-white/20">
                  Kredi Al
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Hata Mesajı */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Bar (üretim sırasında) */}
        {isGenerating && progress && (
          <div className="space-y-2 p-4 rounded-3xl glass-card border border-primary/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                {progress.message}
              </p>
              <span className="text-xs text-muted-foreground">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Ne hayal ediyorsun?
            </Label>
            <Link to="/gallery-upload">
              <Button variant="outline" size="sm" className="h-8 text-xs border-secondary/30 hover:bg-secondary/10">
                <ExternalLink className="w-3 h-3 mr-1" />
                Galeriden Yükle
              </Button>
            </Link>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Örn: Kahve içen mutlu bir kedi, pastel renkler, tatlı ifade..."
              disabled={isGenerating}
              className={cn(
                "w-full h-32 px-5 py-4 rounded-3xl resize-none",
                "bg-muted/30 backdrop-blur-sm border-2 text-foreground text-base",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none focus:border-primary/50 transition-all duration-300",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                prompt ? "border-primary/30" : "border-border/30"
              )}
            />
            {prompt && (
              <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                {prompt.length}/200
              </div>
            )}
          </div>
        </div>

        {/* Options Row: Style & Settings */}
        <div className="flex flex-col gap-4">

          <div className="flex items-center justify-between">
            <Label className="text-foreground font-bold">Stil Seç</Label>
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1.5 rounded-full border",
              removeBackground
                ? "bg-primary/20 border-primary/30"
                : "bg-muted/20 border-border/20"
            )}>
              <Switch
                id="remove-bg"
                checked={removeBackground}
                onCheckedChange={handleBgToggle}
              />
              <Label htmlFor="remove-bg" className="cursor-pointer text-xs font-medium flex items-center gap-1">
                Arka Planı Sil
                {isPro ? (
                  <Crown className="w-3 h-3 text-yellow-500" />
                ) : bgRemovalUnlocked ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Lock className="w-3 h-3 text-muted-foreground" />
                )}
              </Label>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-4 px-4">
            {aiStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={isGenerating}
                className={cn(
                  "flex-shrink-0 w-20 h-24 rounded-xl p-2 relative overflow-hidden transition-all duration-300 snap-start",
                  "flex flex-col items-center justify-center gap-1",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedStyle === style.id
                    ? "glass-card border-2 border-primary/50 glow-violet scale-105"
                    : "glass-card border border-border/30 hover:border-primary/30 active:scale-95"
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



        {/* Generate Buttons Group */}
        <div className="space-y-3">

          {/* Top Row: Starter & Creator */}
          <div className="grid grid-cols-2 gap-3">
            {/* STARTER (Hugging Face) */}
            <Button
              onClick={() => handleGenerate('huggingface')}
              disabled={!prompt.trim() || isGenerating || credits === null}
              className="h-16 rounded-2xl bg-secondary/80 hover:bg-secondary/90 border border-secondary/30 text-secondary-foreground"
            >
              <div className="flex flex-col items-center leading-tight">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span className="font-bold text-sm">Starter</span>
                </div>
                <div className="flex items-center gap-1 opacity-70">
                  <span className="text-[10px]">Standart Kalite • 1 Kredi</span>
                </div>
              </div>
            </Button>

            {/* CREATOR (Runware/Flux) */}
            <Button
              onClick={() => handleGenerate('runware')}
              disabled={!prompt.trim() || isGenerating || credits === null}
              className="h-16 rounded-2xl gradient-primary glow-violet text-white border-none"
            >
              {isGenerating && pendingProvider === 'runware' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <div className="flex flex-col items-center leading-tight">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="font-bold text-sm">Creator</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-90">
                    <span className="text-[10px] bg-black/20 px-2 rounded-full">Yüksek Kalite • 3 Kredi</span>
                  </div>
                </div>
              )}
            </Button>
          </div>

          {/* Bottom Row: Professional (DALL-E) - Center aligned */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleGenerate('dalle')}
              disabled={isGenerating || credits === null}
              className={cn(
                "w-full h-14 rounded-2xl border transition-all relative overflow-hidden",
                // Pro Style vs Locked Style
                isPro
                  ? "bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-500/30 text-white hover:from-purple-800 hover:to-indigo-800"
                  : "bg-muted/10 border-border/30 text-muted-foreground hover:bg-muted/20"
              )}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg">{isPro ? "👑" : "🔒"}</span>
                <div className="flex flex-col items-start leading-none">
                  <span className="font-bold text-sm">Professional {isPro ? "" : "(PRO)"}</span>
                  <span className="text-[10px] opacity-70">En İyi Kalite (DALL-E 3) • 5 Kredi</span>
                </div>
              </div>
              {!isPro && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Crown className="w-4 h-4 text-yellow-500 animate-pulse" />
                </div>
              )}
            </Button>

            {/* Reset Button (If Needed) */}
            {generatedStickers.length > 0 && (
              <Button
                onClick={handleReset}
                disabled={isGenerating}
                variant="ghost"
                className="w-full h-10 text-muted-foreground hover:text-foreground text-xs"
              >
                <X className="w-3 h-3 mr-1" />
                Temizle ve Yeni Başla
              </Button>
            )}
          </div>
        </div>

        {/* GENERATED STICKERS GRID */}
        {generatedStickers.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Üretilen Stickerlar ({generatedStickers.length})
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {generatedStickers.map((sticker, index) => (
                <div
                  key={sticker.id}
                  className="aspect-square rounded-3xl glass-card border border-border/30 p-4 hover-lift"
                  style={{
                    animation: `fadeIn 0.5s ease-out ${index * 0.1}s backwards`
                  }}
                >
                  <img
                    src={sticker.imageUrl}
                    alt="Generated sticker"
                    className="w-full h-full object-contain"
                  />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute bottom-2 right-2 h-8 w-8 rounded-full shadow-lg"
                    onClick={() => handleShare(sticker.imageUrl)}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Animation keyframes */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* BACKGROUND REMOVAL PAYMENT MODAL */}
      <AlertDialog open={showBgModal} onOpenChange={setShowBgModal}>
        <AlertDialogContent className="glass-card gradient-dark border-white/10 max-w-sm">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Wand2 className="w-8 h-8 text-primary" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-white">
              Arka Plan Silme
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/70">
              Sticker'ının arka planını otomatik olarak sil ve şeffaf PNG al!
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 mt-4">
            {/* PRO Option */}
            <button
              onClick={() => {
                setShowBgModal(false);
                navigate('/profile');
              }}
              className="w-full p-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="font-bold text-white">PRO Üyelik</p>
                    <p className="text-xs text-white/60">Sınırsız arka plan silme</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-yellow-500 font-bold">ÖNERİLEN</span>
                  <ExternalLink className="w-4 h-4 text-yellow-500" />
                </div>
              </div>
            </button>

            {/* Credit Option */}
            <button
              onClick={handlePayCredit}
              disabled={credits < 1}
              className={cn(
                "w-full p-4 rounded-2xl border transition-colors text-left",
                credits >= 1
                  ? "border-secondary/30 bg-secondary/10 hover:bg-secondary/20 cursor-pointer"
                  : "border-muted/30 bg-muted/10 opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                    <Coins className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-bold text-white">1 Kredi Kullan</p>
                    <p className="text-xs text-white/60">Mevcut: {credits} kredi</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-secondary">1</span>
              </div>
            </button>

            {/* Ad Option */}
            <button
              onClick={handleWatchAd}
              disabled={isWatchingAd}
              className="w-full p-4 rounded-2xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    {isWatchingAd ? (
                      <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white">
                      {isWatchingAd ? "Reklam yükleniyor..." : "Reklam İzle"}
                    </p>
                    <p className="text-xs text-white/60">Bu oturum için ücretsiz</p>
                  </div>
                </div>
                <span className="text-xs text-green-500 font-bold">ÜCRETSİZ</span>
              </div>
            </button>
          </div>

          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="w-full rounded-xl border-white/10 text-white/60 hover:bg-white/10">
              Vazgeç
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PACK READY MODAL */}
      <AlertDialog open={!!createdPack} onOpenChange={() => setCreatedPack(null)}>
        <AlertDialogContent className="glass-card gradient-dark border-white/10">
          <AlertDialogHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <AlertDialogTitle className="text-center text-xl font-bold text-white">
              Paketiniz Hazır!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-white/70">
              "{createdPack?.name}" paketi başarıyla oluşturuldu. WhatsApp'a ekleyebilir veya galeriye indirebilirsiniz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center flex-col sm:flex-row gap-3 mt-4">

            <Button
              variant="outline"
              className="rounded-xl border-white/10 text-white hover:bg-white/10"
              onClick={() => {
                if (createdPack && createdPackStickers.length > 0) {
                  toast.promise(downloadAllStickers(createdPack, createdPackStickers), {
                    loading: 'İndiriliyor...',
                    success: 'Dosyalar indirildi!',
                    error: 'İndirme başarısız'
                  });
                }
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Galeriye İndir (.zip)
            </Button>

            <Button
              className="rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-bold border-none"
              onClick={() => {
                if (createdPack && createdPackStickers.length > 0) {
                  toast.promise(downloadWhatsAppPack(createdPack, createdPackStickers), {
                    loading: 'WhatsApp paketi hazırlanıyor...',
                    success: 'Paket indirildi! (.wasticker)',
                    error: 'Paket oluşturulamadı'
                  });
                  setCreatedPack(null);
                }
              }}
            >
              <Share2 className="w-4 h-4 mr-2" />
              WhatsApp'a Ekle
            </Button>

          </AlertDialogFooter>
          <div className="text-center mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/40 hover:text-white"
              onClick={() => setCreatedPack(null)}
            >
              Kapat
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generation Progress Modal */}
      <GenerationProgressModal
        isOpen={showProgressModal}
        progress={progress?.progress || 0}
        message={progress?.message || "Hazırlanıyor..."}
        isComplete={generationComplete}
        onComplete={handleProgressComplete}
      />

      {/* No Credit Modal */}
      <NoCreditModal
        isOpen={showNoCreditModal}
        onClose={() => {
          setShowNoCreditModal(false);
          setPendingProvider(null);
        }}
        onCreditsEarned={() => {
          refreshCredits();
          // Auto-retry generation if provider was set
          if (pendingProvider) {
            setShowNoCreditModal(false);
            setTimeout(() => handleGenerate(pendingProvider), 500);
            setPendingProvider(null);
          }
        }}
        featureName="Sticker üretimi"
        requiredCredits={pendingProvider === 'dalle' ? 5 : 1}
      />
    </div>
  );
}
