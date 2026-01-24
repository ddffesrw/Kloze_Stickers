import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Heart, MessageCircle, Download, Crown, Sparkles, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StickerCard } from "@/components/kloze/StickerCard";
import { allPacks } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { useStickerShare } from "@/hooks/useStickerShare";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PackDetailPage() {
  const { id } = useParams();
  const pack = allPacks.find((p) => p.id === id);
  const [isFavorite, setIsFavorite] = useState(pack?.isFavorite || false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  const { 
    isSharing, 
    progress, 
    result, 
    shareWhatsApp, 
    shareTelegram, 
    shareOther,
    reset 
  } = useStickerShare();

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

  const handleWhatsAppShare = async () => {
    reset();
    await shareWhatsApp(pack.name, pack.creator, pack.stickers);
  };

  const handleTelegramShare = async () => {
    reset();
    await shareTelegram(pack.name, pack.stickers);
  };

  const handleGeneralShare = async () => {
    await shareOther(pack.name, `${pack.name} sticker paketi - Kloze Stickers`);
  };

  const progressPercentage = progress 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-28 relative">
      {/* Background */}
      <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />
      
      {/* Hero Header */}
      <div className="relative">
        {/* Cover Image */}
        <div className="aspect-[4/3] w-full overflow-hidden">
          <img
            src={pack.coverImage}
            alt={pack.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20" />
        </div>

        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
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

        {/* Pack Info Card - Overlapping */}
        <div className="absolute -bottom-24 left-4 right-4 z-20">
          <div className="glass-card rounded-3xl p-5 border border-border/30">
            <div className="flex gap-4">
              {/* Creator Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={pack.creatorAvatar}
                  alt={pack.creator}
                  className="w-16 h-16 rounded-2xl border-2 border-primary/30"
                />
                {pack.isPremium && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg gradient-gold glow-gold flex items-center justify-center">
                    <Crown className="w-3 h-3" />
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-black text-foreground truncate">{pack.name}</h1>
                <p className="text-muted-foreground text-sm">by {pack.creator}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-3 mt-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/10 border border-secondary/20">
                    <Sparkles className="w-4 h-4 text-secondary" />
                    <span className="text-sm font-bold text-secondary">{pack.stickers.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Download className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold text-primary">{pack.downloads.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 pt-28 space-y-6">
        {/* Share Buttons */}
        <div className="flex gap-3">
          <Button 
            className="flex-1 h-14 text-base font-bold rounded-2xl relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
            size="lg"
            onClick={handleWhatsAppShare}
            disabled={isSharing}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <MessageCircle className="w-5 h-5 mr-2" />
            WhatsApp
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
            {pack.stickers.map((sticker, index) => (
              <StickerCard
                key={index}
                src={sticker}
                alt={`Sticker ${index + 1}`}
                delay={index * 50}
                onClick={() => console.log("Preview sticker", index)}
              />
            ))}
          </div>
        </div>

        {/* Similar Packs */}
        <div className="space-y-4 pt-4">
          <h2 className="text-lg font-bold text-foreground">Benzer Paketler</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-4">
            {allPacks.filter(p => p.id !== pack.id && p.category === pack.category).slice(0, 4).map((p) => (
              <Link 
                key={p.id}
                to={`/pack/${p.id}`}
                className="flex-shrink-0 w-32"
              >
                <div className="aspect-square rounded-2xl overflow-hidden glass-card border border-border/30 hover-lift">
                  <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-sm font-medium text-foreground mt-2 truncate">{p.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
