import { useState, useRef, useCallback, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Upload, Scissors, Wand2, Loader2, Crown, Coins, Play, Check, X } from "lucide-react";
import { getPendingSharedImages, clearPendingSharedImages } from "@/hooks/useSharedImages";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { auth, supabase } from "@/lib/supabase";
import { removeBackground } from "@/services/backgroundRemovalService";
import { storageService, BUCKETS } from "@/services/storageService";
import { useUserCredits } from "@/hooks/useUserCredits";
import { NoCreditModal } from "@/components/kloze/NoCreditModal";

export default function GalleryUploadPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Handle shared images from other apps (WhatsApp, etc.)
    useEffect(() => {
        // Check location state first (from navigation)
        const stateImages = (location.state as any)?.sharedImages;
        if (stateImages && stateImages.length > 0) {
            // Use first shared image
            const base64 = stateImages[0];
            const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
            setSelectedImage(dataUrl);
            toast.success("Paylaşılan görsel yüklendi!");
            clearPendingSharedImages();
            return;
        }

        // Check pending shared images (global state)
        const pendingImages = getPendingSharedImages();
        if (pendingImages && pendingImages.length > 0) {
            const base64 = pendingImages[0];
            const dataUrl = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
            setSelectedImage(dataUrl);
            toast.success("Paylaşılan görsel yüklendi!");
            clearPendingSharedImages();
        }
    }, [location.state]);
    const [croppedImage, setCroppedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [removeBg, setRemoveBg] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const { credits, invalidateCredits, isLoading: isCreditsLoading } = useUserCredits();
    const [showNoCreditModal, setShowNoCreditModal] = useState(false);

    // Check Pro status
    useEffect(() => {
        const checkPro = async () => {
            const user = await auth.getCurrentUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('is_pro').eq('id', user.id).single();
                setIsPro(data?.is_pro || false);
            }
        };
        checkPro();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Lütfen bir görsel seçin");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result as string);
            setCroppedImage(null);
        };
        reader.readAsDataURL(file);
    };

    const cropToSquare = useCallback(() => {
        if (!selectedImage || !canvasRef.current) return;

        const img = new Image();
        img.onload = () => {
            const canvas = canvasRef.current!;
            const ctx = canvas.getContext('2d')!;

            // 512x512 for WhatsApp/Telegram
            const size = 512;
            canvas.width = size;
            canvas.height = size;

            // Center crop
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

            // Convert to WebP
            const webpUrl = canvas.toDataURL('image/webp', 0.9);
            setCroppedImage(webpUrl);
            toast.success("Fotoğraf kırpıldı!");
        };
        img.src = selectedImage;
    }, [selectedImage]);

    const handleConvertToSticker = async () => {
        if (!croppedImage) {
            toast.error("Önce fotoğrafı kırpın");
            return;
        }

        const user = await auth.getCurrentUser();
        if (!user) {
            toast.error("Lütfen giriş yapın");
            return;
        }

        setIsProcessing(true);
        const toastId = toast.loading("Sticker oluşturuluyor...");

        let bgRemovedUrl: string | null = null;

        try {
            let finalImage = croppedImage;

            // Background removal if enabled
            if (removeBg) {
                if (!isPro && credits < 1) {
                    toast.error("Arka plan silme için kredi veya Pro gerekli", { id: toastId });
                    setIsProcessing(false);
                    return;
                }

                toast.loading("Arka plan siliniyor...", { id: toastId });

                // Convert base64 to blob
                const response = await fetch(croppedImage);
                const blob = await response.blob();

                const result = await removeBackground(blob);
                if (result) {
                    bgRemovedUrl = URL.createObjectURL(result);
                    finalImage = bgRemovedUrl;

                    // Deduct credit for non-Pro users
                    if (!isPro) {
                        await supabase.rpc('deduct_credits', { amount: 1 });
                        invalidateCredits();
                    }
                }
            }

            // Upload to Supabase
            toast.loading("Kaydediliyor...", { id: toastId });

            const imageResponse = await fetch(finalImage);
            const imageBlob = await imageResponse.blob();
            const fileName = `${user.id}/${Date.now()}_gallery.webp`;

            const { publicUrl } = await storageService.upload(
                BUCKETS.STICKERS,
                fileName,
                imageBlob
            );

            // Save to database
            await supabase.from('user_stickers').insert({
                user_id: user.id,
                image_url: publicUrl,
                prompt: 'Gallery Upload',
                emojis: ['📷']
            });

            toast.success("Sticker oluşturuldu! 🎉", { id: toastId });
            navigate('/profile');

        } catch (error: any) {
            console.error("Sticker creation error:", error);
            toast.error(error.message || "İşlem başarısız", { id: toastId });
        } finally {
            if (bgRemovedUrl) URL.revokeObjectURL(bgRemovedUrl);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-28">
            {/* Background */}
            <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />

            {/* Header */}
            <header className="sticky top-0 z-40 glass-card border-b border-border/20 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/generate" className="p-2 rounded-xl bg-muted/30 hover:bg-muted/50">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-black">Galeriden Sticker</h1>
                            <p className="text-[10px] text-muted-foreground">Fotoğrafını sticker'a çevir</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative z-10 p-4 space-y-6">
                {/* Step 1: Select Image */}
                <div className="glass-card rounded-2xl p-4 border border-border/20">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                        <span className="font-bold text-sm">Fotoğraf Seç</span>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    {!selectedImage ? (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-square rounded-2xl border-2 border-dashed border-border/50 hover:border-primary/50 flex flex-col items-center justify-center gap-3 transition-colors"
                        >
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Upload className="w-8 h-8 text-primary" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-sm">Fotoğraf Yükle</p>
                                <p className="text-xs text-muted-foreground">Galeriden seç veya sürükle</p>
                            </div>
                        </button>
                    ) : (
                        <div className="relative">
                            <img
                                src={selectedImage}
                                alt="Selected"
                                className="w-full aspect-square object-cover rounded-2xl"
                            />
                            <button
                                onClick={() => {
                                    setSelectedImage(null);
                                    setCroppedImage(null);
                                }}
                                className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Step 2: Crop */}
                {selectedImage && (
                    <div className="glass-card rounded-2xl p-4 border border-border/20 animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-xs font-bold text-secondary">2</div>
                            <span className="font-bold text-sm">Kırp (512x512)</span>
                        </div>

                        <Button
                            onClick={cropToSquare}
                            className="w-full h-12 gradient-secondary"
                            disabled={!!croppedImage}
                        >
                            <Scissors className="w-5 h-5 mr-2" />
                            {croppedImage ? "Kırpıldı ✓" : "Kare Olarak Kırp"}
                        </Button>

                        {croppedImage && (
                            <div className="mt-4 flex justify-center">
                                <img src={croppedImage} alt="Cropped" className="w-32 h-32 rounded-xl border-2 border-primary/50" />
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Options & Convert */}
                {croppedImage && (
                    <div className="glass-card rounded-2xl p-4 border border-border/20 animate-fade-in">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">3</div>
                            <span className="font-bold text-sm">Seçenekler</span>
                        </div>

                        {/* BG Removal Option */}
                        <div className={cn(
                            "p-4 rounded-xl border mb-4 transition-all",
                            removeBg ? "border-primary/50 bg-primary/10" : "border-border/30 bg-muted/10"
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Wand2 className="w-5 h-5 text-primary" />
                                    <div>
                                        <p className="font-bold text-sm">Arka Planı Sil</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {isPro ? (
                                                <span className="text-green-500 flex items-center gap-1"><Crown className="w-3 h-3" /> Pro ücretsiz</span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-yellow-500 flex items-center gap-1">
                                                        <Coins className="w-3 h-3" />
                                                        1 Kredi gerekli ({isCreditsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : credits} mevcut)
                                                    </span>
                                                    <span className="text-green-500 font-bold ml-4 text-[10px] mt-0.5">
                                                        (Pro plana ücretsiz!)
                                                    </span>
                                                </div>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    checked={removeBg}
                                    onCheckedChange={(checked) => {
                                        if (isCreditsLoading) return;
                                        if (checked && !isPro && credits < 1) {
                                            setShowNoCreditModal(true);
                                        } else {
                                            setRemoveBg(checked);
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Convert Button */}
                        <Button
                            onClick={handleConvertToSticker}
                            disabled={isProcessing}
                            className="w-full h-14 text-base font-bold gradient-primary glow-violet"
                        >
                            {isProcessing ? (
                                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> İşleniyor...</>
                            ) : (
                                <><Check className="w-5 h-5 mr-2" /> Sticker'a Dönüştür</>
                            )}
                        </Button>
                    </div>
                )}

                {/* Hidden Canvas for Processing */}
                <canvas ref={canvasRef} className="hidden" />
            </main>

            {/* No Credit Modal */}
            <NoCreditModal
                isOpen={showNoCreditModal}
                onClose={() => setShowNoCreditModal(false)}
                onCreditsEarned={() => {
                    invalidateCredits();
                    setRemoveBg(true);
                }}
                featureName="Arka plan silme"
            />
        </div>
    );
}
