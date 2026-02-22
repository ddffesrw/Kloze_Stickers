import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Sparkles, Wand2, Zap, Check, AlertCircle, Loader2, Crown, Construction } from "lucide-react";
import { CreditBadge } from "@/components/kloze/CreditBadge";
import { WatchAdButton } from "@/components/kloze/WatchAdButton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { aiStyles, translatePrompt } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useStickerGeneration } from "@/hooks/useStickerGeneration";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { checkPromptSafety, getSafetyWarningMessage } from "@/services/moderationService";
import { getSetting } from "@/services/appSettingsService";
import { getDraftStickers, type Sticker } from "@/services/stickerService";
import { createStickerPack, type StickerPack } from "@/services/stickerPackService";
import { downloadWhatsAppPack, downloadAllStickers } from "@/services/whatsappService";
import { Package, X, CheckCircle, Share2, Copy, Download, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Capacitor } from "@capacitor/core";
import { GenerationProgressModal } from "@/components/kloze/GenerationProgressModal";
import { NoCreditModal } from "@/components/kloze/NoCreditModal";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function GeneratePage() {
  const navigate = useNavigate();
  const { userId, isPro, session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("3d");
  const [removeBackground, setRemoveBackground] = useState(true);
  const [generatedStickers, setGeneratedStickers] = useState<any[]>([]);

  // Low-end device detection - disable heavy animations
  const isLowEnd = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 4 : false;

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
  const pendingProviderRef = useRef(pendingProvider);
  pendingProviderRef.current = pendingProvider;

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

  // Check Maintenance Mode + Admin bypass (uses session from context - no async wait)
  const ADMIN_EMAIL = "johnaxe.storage@gmail.com";
  const isAdmin = session?.user?.email === ADMIN_EMAIL;
  const [isMakerEnabled, setIsMakerEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    getSetting("is_maker_enabled").then(makerVal => {
      setIsMakerEnabled(makerVal !== undefined ? makerVal : false);
    });
  }, []);

  // Still loading settings - show nothing yet
  if (isMakerEnabled === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isMakerEnabled === false && !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Dialog open={true} onOpenChange={() => navigate('/')}>
          <DialogContent className="glass-card border-border/30 max-w-sm mx-auto">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                <Construction className="w-8 h-8 text-white" />
              </div>

              <h2 className="text-xl font-black text-foreground mb-2">
                Sticker Atölyesi
              </h2>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-400">Yakında Aktif</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                AI destekli sticker üretim motoru üzerinde son rötuşları yapıyoruz.
                Çok yakında kendi stickerlarını oluşturabileceksin!
              </p>

              <Button
                onClick={() => navigate('/')}
                className="w-full h-12 rounded-xl font-bold text-sm"
              >
                Paketleri Keşfet
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

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
    setPendingProvider(provider);

    if (!prompt.trim()) {
      toast.error("Lütfen bir prompt girin");
      return;
    }

    // Safety Check
    const safety = checkPromptSafety(prompt);
    if (!safety.isSafe) {
      toast.error(getSafetyWarningMessage(safety));
      return;
    }

    // Kredi kontrolü
    let requiredCredits = 1;
    if (provider === 'runware') requiredCredits = 3;
    if (provider === 'dalle') requiredCredits = 5;

    // PRO kilidini geçici olarak kaldırdım, herkes (veya admin) DALL-E 2 kullanabilsin.
    // if (provider === 'dalle' && !isPro) { ... }

    if (credits < requiredCredits) {
      setPendingProvider(provider);
      setShowNoCreditModal(true);
      return;
    }

    // Show progress modal
    setShowProgressModal(true);
    setGenerationComplete(false);

    // PROMPT ENHANCER
    // 1. Translate Turkish to English for Flux Schnell
    const translatedPrompt = translatePrompt(prompt);
    // 2. Get style keywords
    const selectedStyleObj = aiStyles.find(s => s.id === selectedStyle);
    const stylePrompt = selectedStyleObj ? `, ${selectedStyleObj.prompt}` : "";
    // 3. Schnell-optimized: subject first, then style, then sticker keywords (concise)
    const fullPrompt = `${translatedPrompt}${stylePrompt}, sticker, die-cut, white border, white background, centered, isolated, vector illustration`;

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
   * BG removal is done locally via @imgly WASM - completely free
   * No credit charge needed, just toggle freely
   */
  const handleBgToggle = (checked: boolean) => {
    setRemoveBackground(checked);
  };




  // Progress percentage
  const progressPercentage = progress?.progress || 0;



  return (
    <div className="min-h-screen bg-background pb-28 relative overflow-x-hidden">
      {/* Background - skip heavy effects on low-end devices */}
      {!isLowEnd && (
        <>
          <div className="fixed inset-0 mesh-gradient-intense opacity-40 pointer-events-none" />
          <div className="fixed top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/20 blur-[120px] animate-pulse-glow pointer-events-none" />
          <div className="fixed bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/20 blur-[100px] animate-pulse-glow pointer-events-none" style={{ animationDelay: '1s' }} />
        </>
      )}

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
          <div className="flex items-center gap-2">
            {!isPro && (
              <WatchAdButton onCreditEarned={refreshCredits} />
            )}
            <CreditBadge credits={credits || 0} isPro={isPro} />
          </div>
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
                // Styling changed to be unlocked
                "bg-gradient-to-r from-purple-900 to-indigo-900 border-purple-500/30 text-white hover:from-purple-800 hover:to-indigo-800"
              )}
            >
              <div className="flex items-center justify-center gap-3">
                <span className="text-lg">💰</span>
                <div className="flex flex-col items-start leading-none">
                  <span className="font-bold text-sm">OpenAI DALL-E 2</span>
                  <span className="text-[10px] opacity-70">Standart Kalite • 5 Kredi</span>
                </div>
              </div>
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Sparkles className="w-4 h-4 text-purple-300 animate-pulse" />
              </div>
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
          // Auto-retry generation using ref to avoid stale closure
          const provider = pendingProviderRef.current;
          if (provider) {
            setShowNoCreditModal(false);
            setTimeout(() => handleGenerate(provider), 500);
            setPendingProvider(null);
          }
        }}
        featureName="Sticker üretimi"
        requiredCredits={pendingProvider === 'dalle' ? 5 : 1}
      />
    </div>
  );
}
