import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eraser, Undo, Play, Brush, Trash2, X } from "lucide-react";
import * as fabric from 'fabric';

interface InpaintingModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
    onConfirm: (maskBlob: Blob) => void;
}

export function InpaintingModal({ isOpen, onClose, imageUrl, onConfirm }: InpaintingModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [isReady, setIsReady] = useState(false);

    // Initialize Fabric Canvas
    useEffect(() => {
        if (!isOpen || !canvasRef.current || !imageUrl) return;

        // Dispose old canvas if exists
        if (fabricCanvas) {
            fabricCanvas.dispose();
        }

        const canvas = new fabric.Canvas(canvasRef.current, {
            isDrawingMode: true,
            backgroundColor: 'rgba(0,0,0,0)', // Transparent
            width: 512,
            height: 512
        });

        // Load Background Image
        fabric.Image.fromURL(imageUrl, {
            crossOrigin: 'anonymous'
        }).then((img) => {
            // Scale image to fit 512x512
            const scale = Math.min(512 / img.width!, 512 / img.height!);
            img.scale(scale);

            // Center image
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                originX: 'center',
                originY: 'center',
                left: 256,
                top: 256
            });

            setIsReady(true);
        });

        // Configure Brush (White color for mask)
        const brush = new fabric.PencilBrush(canvas);
        brush.color = 'white';
        brush.width = brushSize;
        canvas.freeDrawingBrush = brush;

        setFabricCanvas(canvas);

        return () => {
            canvas.dispose();
        };
    }, [isOpen, imageUrl]);

    // Update Brush Size
    useEffect(() => {
        if (fabricCanvas) {
            const brush = new fabric.PencilBrush(fabricCanvas);
            brush.color = 'white';
            brush.width = brushSize;
            fabricCanvas.freeDrawingBrush = brush;
        }
    }, [brushSize, fabricCanvas]);

    const handleClear = () => {
        if (fabricCanvas) {
            fabricCanvas.clear();
            // Re-add background
            fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' }).then((img) => {
                const scale = Math.min(512 / img.width!, 512 / img.height!);
                img.scale(scale);
                fabricCanvas.setBackgroundImage(img, fabricCanvas.renderAll.bind(fabricCanvas), {
                    originX: 'center',
                    originY: 'center',
                    left: 256,
                    top: 256
                });
            });
        }
    };

    const handleConfirm = async () => {
        if (!fabricCanvas) return;

        // 1. Get Mask (White brush on Black background)
        // We need to hide the original image and set background to black
        const originalBg = fabricCanvas.backgroundImage;
        fabricCanvas.backgroundImage = undefined;
        fabricCanvas.backgroundColor = 'black';
        fabricCanvas.renderAll();

        // Export as Blob
        const dataUrl = fabricCanvas.toDataURL({
            format: 'png',
            multiplier: 1
        });

        // Convert DataURL to Blob
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        onConfirm(blob);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <Brush className="w-5 h-5" />
                        Bozuk Alanı Boya
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {/* Canvas Wrapper */}
                    <div className="relative w-[512px] h-[512px] bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden shadow-2xl">
                        {!isReady && (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                                Yükleniyor...
                            </div>
                        )}
                        <canvas ref={canvasRef} width={512} height={512} />

                        {/* Guide Text */}
                        <div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
                            <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                                Sadece düzeltmek istediğin yeri beyaza boya (Örn: El, Yüz)
                            </span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="w-full max-w-[512px] flex flex-col gap-4">

                        {/* Brush Size */}
                        <div className="flex items-center gap-4 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                            <span className="text-xs text-zinc-400 font-bold w-16">Fırça Boyutu</span>
                            <Slider
                                value={[brushSize]}
                                min={5}
                                max={100}
                                step={5}
                                onValueChange={(val) => setBrushSize(val[0])}
                                className="flex-1"
                            />
                            <div
                                className="w-8 h-8 rounded-full bg-white border border-zinc-600"
                                style={{ width: brushSize / 2, height: brushSize / 2 }} // Visual indicator
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between">
                            <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={handleClear}>
                                <Trash2 className="w-4 h-4 mr-2" /> Temizle
                            </Button>

                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={onClose} className="bg-zinc-800 text-white hover:bg-zinc-700">
                                    <X className="w-4 h-4 mr-2" /> İptal
                                </Button>
                                <Button onClick={handleConfirm} className="bg-green-500 hover:bg-green-600 text-white font-bold">
                                    <Play className="w-4 h-4 mr-2" /> Düzelt Başlat
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
