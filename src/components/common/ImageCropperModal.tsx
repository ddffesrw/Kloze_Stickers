import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X, Check, ZoomIn, RotateCw } from 'lucide-react';
import { getCroppedImg } from '@/utils/imageUtils';

interface ImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string | null;
    onCropComplete: (croppedBlob: Blob) => void;
    aspectRatio?: number; // Default 1:1
}

export function ImageCropperModal({
    isOpen,
    onClose,
    imageSrc,
    onCropComplete,
    aspectRatio = 1
}: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    const onCropChange = useCallback((crop: { x: number, y: number }) => {
        setCrop(crop);
    }, []);

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom);
    }, []);

    const onRotationChange = useCallback((rotation: number) => {
        setRotation(rotation);
    }, []);

    const onCropAreaChange = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            if (croppedBlob) {
                onCropComplete(croppedBlob);
                onClose();
            }
        } catch (e) {
            console.error('Crop failed', e);
        } finally {
            setProcessing(false);
        }
    };

    if (!imageSrc) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 p-0 overflow-hidden h-full max-h-[80vh] flex flex-col">
                <DialogHeader className="p-4 bg-zinc-900 border-b border-zinc-800 z-10">
                    <DialogTitle className="text-white flex items-center gap-2">
                        <ZoomIn className="w-5 h-5 text-purple-400" />
                        Resmi Kırp & Düzenle
                    </DialogTitle>
                </DialogHeader>

                <div className="relative flex-1 bg-black w-full overflow-hidden min-h-[300px]">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onCropComplete={onCropAreaChange}
                        onZoomChange={onZoomChange}
                        onRotationChange={onRotationChange}
                        classes={{
                            containerClassName: 'crop-container',
                            mediaClassName: 'crop-media',
                        }}
                    />
                </div>

                <div className="p-4 bg-zinc-900 border-t border-zinc-800 space-y-4 z-10">
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Yakınlaştır</span>
                            <span>{zoom.toFixed(1)}x</span>
                        </div>
                        <Slider
                            value={[zoom]}
                            min={1}
                            max={3}
                            step={0.1}
                            onValueChange={(vals) => setZoom(vals[0])}
                            className="py-2"
                        />
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between text-xs text-zinc-400">
                            <span>Döndür</span>
                            <span>{rotation}°</span>
                        </div>
                        <Slider
                            value={[rotation]}
                            min={0}
                            max={360}
                            step={90}
                            onValueChange={(vals) => setRotation(vals[0])}
                            className="py-2"
                        />
                    </div>

                    <DialogFooter className="flex gap-2 sm:justify-between pt-2">
                        <Button variant="ghost" onClick={onClose} disabled={processing} className="flex-1 text-zinc-400 hover:text-white">
                            <X className="w-4 h-4 mr-2" />
                            İptal
                        </Button>
                        <Button onClick={handleSave} disabled={processing} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                            {processing ? 'İşleniyor...' : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Kullan
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
