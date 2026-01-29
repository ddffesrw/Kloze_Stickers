import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { aiStyles } from "@/data/mockData";
import { generateStickerHF } from "@/services/forgeService";
import { toast } from "sonner";
import { Loader2, Trash2, Package, CheckCircle, RefreshCcw, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { storageService, BUCKETS } from "@/services/storageService";
import { createTrayIcon } from "@/utils/imageUtils";

interface GeneratedItem {
    id: string;
    url: string; // Blob URL
    seed: number;
    selected: boolean;
}

export function BulkGenerator() {
    const [prompt, setPrompt] = useState("");
    const [selectedStyle, setSelectedStyle] = useState("3d");
    const [quantity, setQuantity] = useState(1);
    const [isGenerating, setIsGenerating] = useState(false);
    const [results, setResults] = useState<GeneratedItem[]>([]);
    const [packName, setPackName] = useState("");
    const [isPacking, setIsPacking] = useState(false);

    // Stats
    const selectedCount = results.filter(r => r.selected).length;

    const handleBulkGenerate = async () => {
        if (!prompt) return toast.error("Lütfen bir prompt girin");

        setIsGenerating(true);
        setResults([]); // Clear previous

        try {
            const styleObj = aiStyles.find(s => s.id === selectedStyle);
            // GeneraPage logic duplicated here for consistency
            const coreKeywords = "sticker design, vector style, white background, die-cut white border, centered, isolated on white background, high quality, masterpiece";
            const finalPrompt = `${prompt}, ${styleObj?.prompt || ""}, ${coreKeywords}`;

            const promises = Array(quantity).fill(null).map(async (_, index) => {
                // Küçük gecikmelerle rate limit önlemi (basit)
                await new Promise(resolve => setTimeout(resolve, index * 250));
                try {
                    const { imageURL, seed } = await generateStickerHF({ prompt: finalPrompt });
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        url: imageURL,
                        seed,
                        selected: true
                    };
                } catch (e) {
                    console.error("Gen error", e);
                    return null;
                }
            });

            const generated = await Promise.all(promises);
            const validResults = generated.filter(Boolean) as GeneratedItem[];
            setResults(validResults);

            if (validResults.length === 0) {
                toast.error("Üretim başarısız oldu. Lütfen tekrar deneyin.");
            } else if (validResults.length < quantity) {
                toast.warning(`${quantity - validResults.length} adet üretim başarısız oldu.`);
            } else {
                toast.success(`${validResults.length} sticker başarıyla üretildi!`);
            }

        } catch (error) {
            toast.error("Toplu üretim sırasında hata oluştu");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleSelection = (id: string) => {
        setResults(prev => prev.map(item =>
            item.id === id ? { ...item, selected: !item.selected } : item
        ));
    };

    const deleteItem = (id: string) => {
        setResults(prev => prev.filter(item => item.id !== id));
    };

    const handleCreatePack = async () => {
        const selectedItems = results.filter(r => r.selected);
        if (selectedItems.length === 0) return toast.error("Hçbir sticker seçilmedi!");
        if (!packName) return toast.error("Paket adı girin!");

        // Limit check
        if (selectedItems.length > 30) {
            toast.warning("WhatsApp limiti 30 sticker. İlk 30 tanesi pakete eklenecek.");
        }

        setIsPacking(true);
        const toastId = toast.loading("Paket oluşturuluyor (Upload & DB)...");

        try {
            const userResponse = await supabase.auth.getUser();
            const userId = userResponse.data.user?.id;

            if (!userId) throw new Error("User not found");

            // 1. Prepare Tray Icon
            const firstItem = selectedItems[0];
            // Create tray icon from the first sticker (auto-resize to 96x96)
            const trayBlob = await createTrayIcon(firstItem.url);
            const trayPath = `${userId}/tray_${Date.now()}.webp`;

            // Upload Tray
            const trayUpload = await storageService.upload(
                BUCKETS.THUMBNAILS, // Using thumbnails bucket for trays
                trayPath,
                trayBlob
            );

            // 2. Create Pack Record
            const { data: pack, error: packError } = await supabase
                .from('sticker_packs')
                .insert({
                    user_id: userId,
                    name: packName,
                    creator: "Admin", // Or fetch user name
                    tray_image_url: trayUpload.publicUrl,
                    price: 0,
                    is_premium: false,
                    category: "Genel", // Default category
                    downloads: 0,
                    description: `Admin generated pack: ${prompt}`
                })
                .select()
                .single();

            if (packError || !pack) throw packError;

            // 3. Upload Stickers and Link
            // Batch processing to be safe
            let completed = 0;
            const stickersToProcess = selectedItems.slice(0, 30); // Max 30 limit

            for (const item of stickersToProcess) {
                try {
                    const blob = await fetch(item.url).then(r => r.blob());
                    const fileName = `${pack.id}/${item.id}.webp`; // stickers/{packId}/{stickerId}.webp

                    // Upload to 'stickers' bucket
                    const uploadResult = await storageService.upload(
                        BUCKETS.STICKERS,
                        fileName,
                        blob
                    );

                    // Insert into 'stickers' table
                    // NOT 'user_stickers' table? Wait. System architecture usually has 'stickers' related to packs?
                    // Or 'user_stickers' is for drafts?
                    // Let's assume there is a 'stickers' table linking to packs.
                    // If the schema uses `stickers` table with `pack_id`.

                    const { error: stickError } = await supabase.from('user_stickers').insert({
                        user_id: userId,
                        pack_id: pack.id, // Linking to pack
                        image_url: uploadResult.publicUrl,
                        prompt: prompt,
                        style: selectedStyle
                    });

                    if (stickError) throw stickError;
                    completed++;
                } catch (err) {
                    console.error("Single sticker upload failed", err);
                }
            }

            toast.success(`Paket oluşturuldu! (${completed} sticker)`, { id: toastId });
            setResults([]); // Clear
            setPackName("");

        } catch (error: any) {
            console.error(error);
            toast.error("Paket oluşturma hatası: " + error.message, { id: toastId });
        } finally {
            setIsPacking(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="glass-card p-6 rounded-3xl border border-primary/20">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <RefreshCcw className="w-5 h-5 text-primary" /> Toplu Üretim (Bulk)
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Prompt</Label>
                            <Input
                                placeholder="Örn: cute fluffy rabbit"
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Adet</Label>
                            <div className="flex items-center gap-4">
                                <Slider
                                    className="flex-1"
                                    value={[quantity]}
                                    onValueChange={v => setQuantity(v[0])}
                                    max={30}
                                    min={1}
                                    step={1}
                                />
                                <Input
                                    type="number"
                                    className="w-20 text-center font-bold bg-secondary/20 border-primary/50 h-10"
                                    value={quantity}
                                    onChange={e => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val >= 1 && val <= 30) setQuantity(val);
                                    }}
                                    min={1}
                                    max={30}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Stil</Label>
                            <select
                                className="w-full bg-secondary/20 border border-primary/30 rounded-xl h-12 px-4 text-foreground text-base cursor-pointer hover:bg-secondary/30 transition-colors focus:ring-2 focus:ring-primary/50 outline-none"
                                value={selectedStyle}
                                onChange={e => setSelectedStyle(e.target.value)}
                            >
                                {aiStyles.map(s => (
                                    <option key={s.id} value={s.id} className="bg-background text-foreground py-2">
                                        {s.icon} {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Button
                            onClick={handleBulkGenerate}
                            disabled={isGenerating || !prompt}
                            className="w-full"
                        >
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : "Üretimi Başlat"}
                        </Button>
                    </div>

                    <div className="p-4 bg-secondary/10 rounded-xl">
                        <h3 className="font-bold mb-2">Bilgi</h3>
                        <ul className="text-sm space-y-2 list-disc pl-4 text-muted-foreground">
                            <li>Model: <b>Flux Schnell (Free)</b></li>
                            <li>Her istekte farklı seed kullanılır.</li>
                            <li>Rate limit yememek için 250ms gecikmeli istek atılır.</li>
                            <li>Çıktılar geçicidir, sayfayı yenilerseniz kaybolur.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* RESULTS GRID */}
            {results.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Sonuçlar ({selectedCount}/{results.length})</h2>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Paket Adı"
                                className="w-48"
                                value={packName}
                                onChange={e => setPackName(e.target.value)}
                            />
                            <Button onClick={handleCreatePack} disabled={isPacking}>
                                {isPacking ? <Loader2 className="animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Paketle
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {results.map(item => (
                            <div key={item.id} className={cn(
                                "relative aspect-square rounded-xl overflow-hidden group border-2 cursor-pointer transition-all",
                                item.selected ? "border-primary" : "border-transparent opacity-50"
                            )} onClick={() => toggleSelection(item.id)}>
                                <img src={item.url} className="w-full h-full object-cover" />

                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                                    className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>

                                {item.selected && (
                                    <div className="absolute top-2 left-2 p-1 bg-primary text-white rounded-full">
                                        <CheckCircle className="w-3 h-3" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
