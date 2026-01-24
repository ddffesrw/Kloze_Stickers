import { useState } from "react";
import { Sparkles, Coins, RotateCcw, Wand2, Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { aiStyles, currentUser } from "@/data/mockData";
import { cn } from "@/lib/utils";

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("3d");
  const [removeBackground, setRemoveBackground] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSticker, setGeneratedSticker] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGeneratedSticker(null);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    setGeneratedSticker(`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${prompt}`);
    setIsGenerating(false);
  };

  const handleReset = () => {
    setPrompt("");
    setGeneratedSticker(null);
  };

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
      
      {/* Header */}
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-card border border-secondary/30">
            <Coins className="w-4 h-4 text-secondary" />
            <span className="font-bold text-secondary">{currentUser.credits}</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-4 space-y-6">
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
              className={cn(
                "w-full h-32 px-5 py-4 rounded-3xl resize-none",
                "bg-muted/30 backdrop-blur-sm border-2 text-foreground text-base",
                "placeholder:text-muted-foreground/60",
                "focus:outline-none focus:border-primary/50 transition-all duration-300",
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
                className={cn(
                  "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-300",
                  selectedStyle === style.id
                    ? "bg-primary/20 border-primary/50 glow-violet"
                    : "bg-muted/20 border-border/30 hover:border-border/50 hover:bg-muted/30"
                )}
              >
                {selectedStyle === style.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </div>
                )}
                <span className="text-3xl">{styleIcons[style.id]}</span>
                <span className={cn(
                  "text-xs font-medium",
                  selectedStyle === style.id ? "text-primary" : "text-muted-foreground"
                )}>
                  {style.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center justify-between p-5 rounded-3xl glass-card border border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <Label className="text-foreground font-semibold">Şeffaf Arka Plan</Label>
              <p className="text-xs text-muted-foreground">Sticker için ideal</p>
            </div>
          </div>
          <Switch
            checked={removeBackground}
            onCheckedChange={setRemoveBackground}
            className="data-[state=checked]:bg-secondary"
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className={cn(
            "w-full h-16 text-lg font-bold rounded-3xl relative overflow-hidden",
            "gradient-primary glow-violet",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          size="lg"
        >
          {!isGenerating && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
          )}
          {isGenerating ? (
            <span className="flex items-center gap-3">
              <div className="w-6 h-6 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              AI Sihri Çalışıyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Sticker Üret
              <span className="ml-2 px-3 py-1 bg-primary-foreground/20 rounded-full text-sm">
                1 Kredi
              </span>
            </span>
          )}
        </Button>

        {/* Preview Area */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-bold">Önizleme</Label>
            {generatedSticker && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Sıfırla
              </button>
            )}
          </div>

          <div className="aspect-square rounded-3xl overflow-hidden glass-card border-2 border-border/30 relative">
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Animated Background */}
                <div className="absolute inset-0 gradient-rainbow opacity-20" />
                
                {/* Loading Animation */}
                <div className="relative text-center space-y-4">
                  <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-secondary/20" />
                    <div className="absolute inset-2 rounded-full border-4 border-t-transparent border-r-secondary border-b-transparent border-l-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    <div className="absolute inset-4 rounded-full bg-muted/50 flex items-center justify-center">
                      <Wand2 className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <p className="text-muted-foreground font-medium">Sihir yapılıyor...</p>
                </div>
              </div>
            ) : generatedSticker ? (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="relative animate-bounce-in">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl" />
                  <img
                    src={generatedSticker}
                    alt="Generated Sticker"
                    className="relative max-w-full max-h-full object-contain sticker-style animate-float"
                  />
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <p className="text-muted-foreground">Sticker'ın burada belirecek</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {generatedSticker && !isGenerating && (
            <div className="flex gap-3 animate-slide-up">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-border/50 hover:bg-muted/30"
              >
                Kaydet
              </Button>
              <Button
                className="flex-1 h-14 rounded-2xl gradient-secondary text-secondary-foreground glow-cyan"
              >
                WhatsApp'a Ekle
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
