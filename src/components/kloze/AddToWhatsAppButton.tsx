/**
 * AddToWhatsAppButton Component
 * WhatsApp'a sticker paketi eklemek için buton bileşeni
 */

import { Button } from '@/components/ui/button';
import { useWhatsAppStickers, getProgressMessage } from '@/hooks/useWhatsAppStickers';
import type { StickerPackInfo } from '@/services/whatsappStickerService';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddToWhatsAppButtonProps {
  packInfo: StickerPackInfo;
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * WhatsApp'a ekle butonu
 *
 * @example
 * ```tsx
 * <AddToWhatsAppButton
 *   packInfo={{
 *     identifier: 'kloze_funny_001',
 *     name: 'Komik Sticker\'lar',
 *     publisher: 'Kloze',
 *     trayImageUrl: 'https://...',
 *     stickers: [...] // Supabase'den çekilen sticker'lar
 *   }}
 * >
 *   WhatsApp'a Ekle
 * </AddToWhatsAppButton>
 * ```
 */
export function AddToWhatsAppButton({
  packInfo,
  children = 'WhatsApp\'a Ekle',
  className,
  variant = 'default',
  size = 'default'
}: AddToWhatsAppButtonProps) {
  const { addToWhatsApp, isLoading, progress, error } = useWhatsAppStickers();
  const { toast } = useToast();

  const handleClick = async () => {
    const result = await addToWhatsApp(packInfo);

    if (result.success) {
      toast({
        title: 'Başarılı!',
        description: result.message,
        variant: 'default'
      });
    } else {
      toast({
        title: 'Hata',
        description: result.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {progress ? getProgressMessage(progress) : 'İşleniyor...'}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
