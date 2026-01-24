import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Coins, RotateCcw, Wand2, Zap, Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { aiStyles } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useStickerGeneration } from "@/hooks/useStickerGeneration";
import { auth } from "@/lib/supabase";
import { toast } from "sonner";
import { getDraftStickers, createStickerPack, type Sticker, type StickerPack } from "@/services/stickerService";
import { downloadWhatsAppPack, downloadAllStickers } from "@/services/whatsappService";
import { Package, X, CheckCircle, Share2, Copy, Download } from "lucide-react";
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

export default function GeneratePage() {
  const [userId, setUserId] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("3d");
  const [removeBackground, setRemoveBackground] = useState(true);
  const [generatedStickers, setGeneratedStickers] = useState<any[]>([]);

  // Sticker Pool & Packaging
  const [drafts, setDrafts] = useState<Sticker[]>([]);
  const [selectedStickerIds, setSelectedStickerIds] = useState<Set<string>>(new Set());
  const [isPackCreating, setIsPackCreating] = useState(false);

  const [createdPack, setCreatedPack] = useState<StickerPack | null>(null);
  const [createdPackStickers, setCreatedPackStickers] = useState<Sticker[]>([]);

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

  // User ID al
  useEffect(() => {
    const getCurrentUser = async () => {
      const user = await auth.getCurrentUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getCurrentUser();
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
  const handleGenerate = async (provider: 'runware' | 'huggingface') => {
    if (!prompt.trim()) {
      toast.error("Lütfen bir prompt girin");
      return;
    }

    if (!hasEnoughCredits && provider === 'runware') {
      toast.error("Yetersiz kredi! Kredi satın alın veya ücretsiz modu deneyin.");
      return;
    }

    const fullPrompt = getFullPrompt();

    // MOTOR TETİKLE
    const result = await generate(fullPrompt, provider);

    console.log('Generate successful, result:', result);

    if (result) {
      // Başarılı - grid'e ekle
      setGeneratedStickers(prev => [result, ...prev]);
      toast.success("Sticker başarıyla oluşturuldu!");
    } else if (error) {
      toast.error(error);
    } else {
      // Refresh drafts after generation
      fetchDrafts();
    }
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
    const styleHint = selectedStyle !== "3d" ? `, ${selectedStyle} style` : "";
    const fullPrompt = `${prompt}${styleHint}, sticker style`;

    return fullPrompt;
  };

  const handleReset = () => {
    setPrompt("");
    setGeneratedStickers([]);
    resetError();
  };



  // Progress percentage
  const progressPercentage = progress?.progress || 0;

  const styleIcons: Record<string, string> = {
    "3d": "🎲",
    "anime": "🌸",
    "minimalist": "◯",
    "vector": "✏️",
  };

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
                {credits}
              </span>
            </div>
          </Link>
        </div>
      </header>

      <main className="relative z-10 p-4 space-y-6">
        {/* Yetersiz Kredi Uyarısı */}
        {!hasEnoughCredits && (
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
          <Label className="text-foreground font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Ne hayal ediyorsun?
          </Label>
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

        {/* Style Selector */}
        <div className="space-y-3">
          <Label className="text-foreground font-bold">Stil Seç</Label>
          <div className="grid grid-cols-4 gap-3">
            {aiStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={isGenerating}
                className={cn(
                  "aspect-square rounded-3xl p-4 relative overflow-hidden transition-all duration-300",
                  "flex flex-col items-center justify-center gap-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedStyle === style.id
                    ? "glass-card border-2 border-primary/50 glow-violet scale-105"
                    : "glass-card border border-border/30 hover:border-primary/30 hover:scale-105"
                )}
              >
                <span className="text-3xl">{styleIcons[style.id]}</span>
                <span className="text-xs font-bold text-foreground">{style.name}</span>
                {selectedStyle === style.id && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>



        {/* Generate Buttons Group */}
        <div className="flex gap-3">
          {/* RUNWARE BUTTON */}
          <Button
            onClick={() => handleGenerate('runware')}
            disabled={!prompt.trim() || isGenerating}
            className="flex-1 h-14 text-base font-bold rounded-2xl gradient-primary glow-violet disabled:opacity-50"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Üretiliyor...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Hızlı Üret (Flux)
                <span className="ml-2 text-xs opacity-70 bg-black/20 px-2 py-0.5 rounded-full">
                  {credits} Kredi
                </span>
              </>
            )}
          </Button>

          {/* HUGGING FACE BUTTON */}
          <Button
            onClick={() => handleGenerate('huggingface')}
            disabled={!prompt.trim() || isGenerating}
            className="flex-1 h-14 text-base font-bold rounded-2xl bg-secondary hover:bg-secondary/80 text-secondary-foreground disabled:opacity-50 border border-border/50"
            size="lg"
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Ücretsiz Üret (HF)
                <span className="ml-2 text-xs opacity-70 bg-black/10 px-2 py-0.5 rounded-full">
                  Free
                </span>
              </>
            )}
          </Button>

          {generatedStickers.length > 0 && (
            <Button
              onClick={handleReset}
              disabled={isGenerating}
              variant="outline"
              className="h-14 px-6 rounded-2xl"
              size="lg"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          )}
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
              "{createdPack?.title}" paketi başarıyla oluşturuldu. WhatsApp'a ekleyebilir veya galeriye indirebilirsiniz.
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
    </div>
  );
}
