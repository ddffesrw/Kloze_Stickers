import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Heart, MessageCircle, Download, Crown, Sparkles, Send, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { StickerCard } from "@/components/kloze/StickerCard";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useStickerShare } from "@/hooks/useStickerShare";
import { canAddToWhatsApp } from "@/services/stickerPackLogicService";
import { getStickerPackById } from "@/services/stickerPackService";
import { toast } from "sonner";

export default function PackDetailPage() {
  const { id } = useParams();
  const [pack, setPack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Sticker share hook (MOTOR BAĞLANTISI)
  const {
    isSharing,
    progress,
    result,
    shareWhatsApp,
    shareTelegram,
    shareOther,
    reset
  } = useStickerShare();

  // Pack'i Supabase'den çek
  useEffect(() => {
    const fetchPack = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const packData = await getStickerPackById(id);

        if (packData) {
          setPack(packData);
          setIsFavorite(false); // TODO: User favorites'tan çek
        }
      } catch (error) {
        console.error('Pack fetch error:', error);
        toast.error('Paket yüklenemedi');
      } finally {
        setLoading(false);
      }
    };

    fetchPack();
  }, [id]);

  /**
   * WHATSAPP'A GÖNDER - NATIVE BRIDGE TETİKLEME
   */
  const handleWhatsAppShare = async () => {
    if (!pack) return;

    // Validation
    const stickerUrls = pack.stickers.map((s: any) => s.image_url);
    const isValid = canAddToWhatsApp(
      stickerUrls.map((url: string, i: number) => ({
        id: `${i}`,
        imageUrl: url
      }))
    );

    if (!isValid) {
      toast.error('Bu paket en az 3 sticker içermelidir');
      return;
    }

    reset();
    // NATIVE BRIDGE TETİKLE
    await shareWhatsApp(pack.name, pack.publisher, stickerUrls);
  };

  const handleTelegramShare = async () => {
    if (!pack) return;
    reset();
    const stickerUrls = pack.stickers.map((s: any) => s.image_url);
    await shareTelegram(pack.name, stickerUrls);
  };

  const handleGeneralShare = async () => {
    if (!pack) return;
    await shareOther(pack.name, `${pack.name} sticker paketi - Kloze Stickers`);
  };

  const progressPercentage = progress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // Can add to WhatsApp?
  const canAddPack = pack ? canAddToWhatsApp(
    pack.stickers.map((s: any, i: number) => ({
      id: `${i}`,
      imageUrl: s.image_url
    }))
  ) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pack) {
    return (
      <div className="min-h-screen bg-background mesh-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
            <span className="text-5xl">😕</span>
          </div>
          <p className="text-muted-foreground text-lg">Paket bulunamadı</p>
          <Link to="/" className="inline-flex items-center gap-2 mt-4 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Ana sayfaya dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background */}
      <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />

      {/* Compact Header - No Cover Image */}
      <div className="relative pt-4 pb-6 px-4">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="p-3 rounded-2xl glass-card border border-border/30 hover:bg-muted/50 transition-all hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Link>
          <div className="flex gap-2">
            <button
              onClick={() => setIsFavorite(!isFavorite)}
              className={cn(
                "p-3 rounded-2xl glass-card border transition-all hover:scale-105",
                isFavorite ? "border-accent/50 bg-accent/10" : "border-border/30"
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5 transition-all",
                  isFavorite ? "fill-accent text-accent" : "text-foreground"
                )}
              />
            </button>
            <button
              onClick={handleGeneralShare}
              className="p-3 rounded-2xl glass-card border border-border/30 hover:bg-muted/50 transition-all hover:scale-105"
            >
              <Share2 className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Pack Info Card */}
        <div className="glass-card rounded-3xl p-5 border border-border/30">
          <div className="flex gap-4">
            {/* Creator Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={pack.creator_avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'}
                alt={pack.creator_name}
                className="w-16 h-16 rounded-2xl border-2 border-primary/30"
              />
              {pack.is_premium && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg gradient-gold glow-gold flex items-center justify-center">
                  <Crown className="w-3 h-3" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-foreground truncate">{pack.name}</h1>
              <p className="text-muted-foreground text-sm">by {pack.publisher}</p>

              {/* Stats */}
              <div className="flex items-center gap-3 mt-3">
                {pack.is_premium && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-gold">
                    <Crown className="w-4 h-4" />
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20">
                  <Sparkles className="w-4 h-4 text-secondary" />
                  <span className="text-sm font-bold text-secondary">{pack.stickers.length}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                  <Download className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{(pack.downloads || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 space-y-6">
        {/* Share Buttons - WHATSAPP BUTONU 3+ STICKER'DA AKTİF */}
        <div className="flex gap-3">
          <Button
            className={cn(
              "flex-1 h-14 text-base font-bold rounded-2xl relative overflow-hidden group",
              !canAddPack && "opacity-50 cursor-not-allowed"
            )}
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            size="lg"
            onClick={handleWhatsAppShare}
            disabled={isSharing || !canAddPack}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            {isSharing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Gönderiliyor...
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp {!canAddPack && `(${pack.stickers.length}/3)`}
              </>
            )}
          </Button>

          <Button
            className="flex-1 h-14 text-base font-bold rounded-2xl relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #0088cc, #229ED9)' }}
            size="lg"
            onClick={handleTelegramShare}
            disabled={isSharing}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Send className="w-5 h-5 mr-2" />
            Telegram
          </Button>
        </div>

        {/* Validation Warning */}
        {!canAddPack && (
          <Alert>
            <AlertDescription>
              WhatsApp'a göndermek için en az 3 sticker gerekli. Şu anda: {pack.stickers.length} sticker
            </AlertDescription>
          </Alert>
        )}

        {/* Progress Dialog */}
        <Dialog open={isSharing || !!result} onOpenChange={() => { if (!isSharing) reset(); }}>
          <DialogContent className="glass-card border-border/30">
            <DialogHeader>
              <DialogTitle className="text-center">
                {isSharing ? 'Sticker Paketi Hazırlanıyor' : result?.success ? '✅ Başarılı!' : '⚠️ Bilgi'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {isSharing && progress && (
                <>
                  <Progress value={progressPercentage} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    {progress.message}
                  </p>
                </>
              )}

              {result && (
                <p className="text-center text-muted-foreground">
                  {result.message}
                </p>
              )}

              {!isSharing && result && (
                <Button
                  className="w-full"
                  onClick={reset}
                >
                  Tamam
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Sticker Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Sticker'lar</h2>
            <span className="text-sm text-muted-foreground">{pack.stickers.length} adet</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {pack.stickers.map((sticker: any, index: number) => (
              <StickerCard
                key={sticker.id}
                src={sticker.image_url}
                alt={`Sticker ${index + 1}`}
                delay={index * 50}
                onClick={() => console.log("Preview sticker", index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
