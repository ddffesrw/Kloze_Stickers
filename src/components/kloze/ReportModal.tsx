import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Flag } from "lucide-react";
import { toast } from "sonner";
import { reportPack, reportUser } from "@/services/reportService";

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    packId?: string;
    userId?: string;
    packTitle?: string;
}

const REPORT_REASONS = [
    { value: 'inappropriate', label: '😡 Uygunsuz İçerik', description: 'Rahatsız edici veya aşağılayıcı' },
    { value: 'spam', label: '🚫 Spam', description: 'Gereksiz tekrar veya reklam' },
    { value: 'copyright', label: '©️ Telif İhlali', description: 'Başkasının eserine ait' },
    { value: 'hate_speech', label: '⚠️ Nefret Söylemi', description: 'Ayrımcılık, ırkçılık' },
    { value: 'other', label: '❓ Diğer', description: 'Başka bir sebep' },
] as const;

export function ReportModal({ isOpen, onClose, packId, userId, packTitle }: ReportModalProps) {
    const [selectedReason, setSelectedReason] = useState<typeof REPORT_REASONS[number]['value'] | null>(null);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            toast.error('Lütfen bir sebep seçin');
            return;
        }

        setIsSubmitting(true);
        try {
            let result;
            if (packId) {
                result = await reportPack(packId, selectedReason, description || undefined);
            } else if (userId) {
                result = await reportUser(userId, selectedReason, description || undefined);
            } else {
                throw new Error('Pack ID or User ID required');
            }

            if (result.success) {
                toast.success(result.message);
                onClose();
                setSelectedReason(null);
                setDescription('');
            } else {
                toast.error(result.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Rapor gönderilemedi');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Flag className="w-5 h-5 text-destructive" />
                        İçerik Bildir
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {packTitle && (
                        <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            <strong>Paket:</strong> {packTitle}
                        </div>
                    )}

                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg flex gap-2 text-amber-500">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-xs">
                            Sahte raporlar ciddi şekilde değerlendirilir. Lütfen yalnızca gerçek ihlalleri bildirin.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Sebep Seçin:</label>
                        <div className="space-y-2">
                            {REPORT_REASONS.map((reason) => (
                                <button
                                    key={reason.value}
                                    onClick={() => setSelectedReason(reason.value)}
                                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedReason === reason.value
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border/30 hover:border-primary/30 bg-muted/20'
                                        }`}
                                >
                                    <div className="font-semibold text-sm">{reason.label}</div>
                                    <div className="text-xs text-muted-foreground">{reason.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold">
                            Detaylar <span className="text-muted-foreground font-normal">(Opsiyonel)</span>
                        </label>
                        <Textarea
                            placeholder="Daha fazla bilgi verin..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                        İptal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleSubmit}
                        disabled={!selectedReason || isSubmitting}
                    >
                        {isSubmitting ? 'Gönderiliyor...' : 'Rapor Gönder'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
