import { useState } from "react";
import { Package, Plus, Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { StickerPack } from "@/services/stickerPackService";

interface PackSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    stickerCount: number;
    userPacks: StickerPack[];
    onAddToPack: (packId: string) => Promise<void>;
    onCreateNewPack: (packName: string, category?: string) => Promise<void>;
    isLoading?: boolean;
}

export function PackSelectorModal({
    isOpen,
    onClose,
    stickerCount,
    userPacks,
    onAddToPack,
    onCreateNewPack,
    isLoading = false,
}: PackSelectorModalProps) {
    const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newPackName, setNewPackName] = useState("");
    const [newPackCategory, setNewPackCategory] = useState("Eğlence");

    const handleConfirm = async () => {
        if (isCreatingNew && newPackName.trim()) {
            await onCreateNewPack(newPackName.trim(), newPackCategory);
        } else if (selectedPackId) {
            await onAddToPack(selectedPackId);
        }
    };

    const handleClose = () => {
        setSelectedPackId(null);
        setIsCreatingNew(false);
        setNewPackName("");
        setNewPackCategory("Eğlence");
        onClose();
    };

    const canConfirm = (isCreatingNew && newPackName.trim().length >= 2) || selectedPackId;

    return (
        <AlertDialog open={isOpen} onOpenChange={handleClose}>
            <AlertDialogContent className="glass-card gradient-dark border-white/10 max-w-sm">
                <AlertDialogHeader>
                    <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                        <Package className="w-7 h-7 text-primary" />
                    </div>
                    <AlertDialogTitle className="text-center text-lg font-bold text-white">
                        Stickerleri Nereye Ekleyelim?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-white/60 text-sm">
                        {stickerCount} sticker seçildi
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto">
                    {/* Create New Pack Option */}
                    <button
                        onClick={() => {
                            setIsCreatingNew(true);
                            setSelectedPackId(null);
                        }}
                        className={cn(
                            "w-full p-3 rounded-2xl border transition-all flex items-center gap-3",
                            isCreatingNew
                                ? "border-primary bg-primary/20"
                                : "border-white/10 bg-white/5 hover:bg-white/10"
                        )}
                    >
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-left flex-1">
                            <p className="font-bold text-white text-sm">Yeni Paket Oluştur</p>
                            <p className="text-[11px] text-white/50">Bu stickerlarla yeni paket başlat</p>
                        </div>
                        {isCreatingNew && (
                            <Check className="w-5 h-5 text-primary" />
                        )}
                    </button>

                    {/* New Pack Name & Category Input */}
                    {isCreatingNew && (
                        <div className="pl-2 space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            <Input
                                value={newPackName}
                                onChange={(e) => setNewPackName(e.target.value)}
                                placeholder="Paket adı girin..."
                                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                                autoFocus
                                maxLength={30}
                            />
                            <select
                                value={newPackCategory}
                                onChange={(e) => setNewPackCategory(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                            >
                                <option value="Eğlence">😂 Eğlence</option>
                                <option value="Hayvanlar">🐱 Hayvanlar</option>
                                <option value="Aşk">❤️ Aşk</option>
                                <option value="Gaming">🎮 Gaming</option>
                                <option value="Anime">✨ Anime</option>
                                <option value="Meme">🤣 Meme</option>
                                <option value="Müzik">🎵 Müzik</option>
                                <option value="Spor">⚽ Spor</option>
                            </select>
                            <p className="text-[10px] text-white/40 text-right">{newPackName.length}/30</p>
                        </div>
                    )}

                    {/* Existing Packs */}
                    {userPacks.length > 0 && (
                        <>
                            <div className="text-[11px] text-white/40 uppercase tracking-wide px-1 pt-2">
                                Mevcut Paketler
                            </div>
                            {userPacks.map((pack) => (
                                <button
                                    key={pack.id}
                                    onClick={() => {
                                        setSelectedPackId(pack.id);
                                        setIsCreatingNew(false);
                                    }}
                                    className={cn(
                                        "w-full p-3 rounded-2xl border transition-all flex items-center gap-3",
                                        selectedPackId === pack.id
                                            ? "border-secondary bg-secondary/20"
                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                    )}
                                >
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted/20 flex-shrink-0">
                                        <img
                                            src={pack.tray_image_url || pack.stickers?.[0]?.image_url || "/placeholder.png"}
                                            alt={pack.name}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="font-bold text-white text-sm truncate">{pack.name}</p>
                                        <p className="text-[11px] text-white/50">{pack.stickers?.length || 0} sticker</p>
                                    </div>
                                    {selectedPackId === pack.id && (
                                        <Check className="w-5 h-5 text-secondary flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </>
                    )}
                </div>

                <AlertDialogFooter className="mt-4 flex gap-2">
                    <AlertDialogCancel
                        className="flex-1 rounded-xl border-white/10 text-white/60 hover:bg-white/10"
                        disabled={isLoading}
                    >
                        İptal
                    </AlertDialogCancel>
                    <Button
                        onClick={handleConfirm}
                        disabled={!canConfirm || isLoading}
                        className="flex-1 rounded-xl gradient-primary font-bold"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                İşleniyor...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                {isCreatingNew ? "Oluştur" : "Ekle"}
                            </>
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
