/**
 * Sticker Pack Example
 * WhatsApp'a sticker paketi ekleme örnek kullanım
 */

import { useState, useEffect } from 'react';
import { AddToWhatsAppButton } from '@/components/kloze/AddToWhatsAppButton';
import { useWhatsAppStickers, getProgressMessage } from '@/hooks/useWhatsAppStickers';
import type { StickerPackInfo } from '@/services/whatsappStickerService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, Check, X } from 'lucide-react';

// Örnek: Supabase'den çekilmiş sticker paketi verisi
const examplePackInfo: StickerPackInfo = {
  identifier: 'kloze_funny_001',
  name: 'Komik Stickerlar',
  publisher: 'Kloze Stickers',
  trayImageUrl: 'https://your-supabase-url.supabase.co/storage/v1/object/public/stickers/funny/tray.png',
  stickers: [
    {
      id: '1',
      url: 'https://your-supabase-url.supabase.co/storage/v1/object/public/stickers/funny/sticker1.webp',
      emojis: ['😀', '😄', '😁']
    },
    {
      id: '2',
      url: 'https://your-supabase-url.supabase.co/storage/v1/object/public/stickers/funny/sticker2.webp',
      emojis: ['😂', '🤣']
    },
    {
      id: '3',
      url: 'https://your-supabase-url.supabase.co/storage/v1/object/public/stickers/funny/sticker3.webp',
      emojis: ['😎', '🕶️']
    },
    // ... daha fazla sticker (3-30 arası)
  ],
  publisherWebsite: 'https://kloze.app',
  privacyPolicyWebsite: 'https://kloze.app/privacy',
  licenseAgreementWebsite: 'https://kloze.app/terms'
};

/**
 * Örnek 1: Basit Kullanım - Hazır Buton Bileşeni
 */
export function SimpleExample() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{examplePackInfo.name}</CardTitle>
        <CardDescription>
          {examplePackInfo.publisher} • {examplePackInfo.stickers.length} sticker
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {examplePackInfo.stickers.slice(0, 6).map((sticker) => (
            <img
              key={sticker.id}
              src={sticker.url}
              alt="Sticker"
              className="w-full aspect-square rounded-lg"
            />
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <AddToWhatsAppButton packInfo={examplePackInfo} className="w-full">
          WhatsApp'a Ekle
        </AddToWhatsAppButton>
      </CardFooter>
    </Card>
  );
}

/**
 * Örnek 2: İleri Seviye - Progress ve Hata Yönetimi
 */
export function AdvancedExample() {
  const { addToWhatsApp, isLoading, progress, error, resetError } = useWhatsAppStickers();
  const [success, setSuccess] = useState(false);

  const handleAddToWhatsApp = async () => {
    setSuccess(false);
    resetError();

    const result = await addToWhatsApp(examplePackInfo);

    if (result.success) {
      setSuccess(true);
      // 3 saniye sonra success mesajını kaldır
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const progressPercentage = progress
    ? (progress.current / progress.total) * 100
    : 0;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{examplePackInfo.name}</CardTitle>
        <CardDescription>
          İlerlemeli indirme ve detaylı hata yönetimi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress göstergesi */}
        {isLoading && progress && (
          <div className="space-y-2">
            <Progress value={progressPercentage} />
            <p className="text-sm text-muted-foreground text-center">
              {getProgressMessage(progress)}
            </p>
          </div>
        )}

        {/* Başarı mesajı */}
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Sticker paketi başarıyla WhatsApp'a eklendi!
            </AlertDescription>
          </Alert>
        )}

        {/* Hata mesajı */}
        {error && (
          <Alert variant="destructive">
            <X className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Sticker önizleme */}
        <div className="grid grid-cols-4 gap-2">
          {examplePackInfo.stickers.slice(0, 8).map((sticker) => (
            <div key={sticker.id} className="relative group">
              <img
                src={sticker.url}
                alt="Sticker"
                className="w-full aspect-square rounded-lg"
              />
              <div className="absolute bottom-0 right-0 text-xs bg-black/50 text-white px-1 rounded-tl">
                {sticker.emojis?.join('')}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleAddToWhatsApp}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              İşleniyor...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              WhatsApp'a Ekle
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Örnek 3: Supabase Entegrasyonu
 */
export function SupabaseExample({ packId }: { packId: string }) {
  const [packInfo, setPackInfo] = useState<StickerPackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToWhatsApp, isLoading } = useWhatsAppStickers();

  useEffect(() => {
    // Gerçek projede burayı Supabase client ile değiştirin
    const fetchPackFromSupabase = async () => {
      try {
        // Örnek: Supabase query
        // const { data } = await supabase
        //   .from('sticker_packs')
        //   .select(`
        //     id,
        //     name,
        //     publisher,
        //     tray_image_url,
        //     stickers (id, image_url, emojis)
        //   `)
        //   .eq('id', packId)
        //   .single();

        // Mock data - gerçek projede üstteki query kullanılacak
        await new Promise(resolve => setTimeout(resolve, 1000));

        setPackInfo({
          identifier: `kloze_${packId}`,
          name: 'Dinamik Paket',
          publisher: 'Kloze',
          trayImageUrl: 'https://...',
          stickers: [
            // Supabase'den gelen sticker'lar
          ]
        });
      } catch (error) {
        console.error('Supabase error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackFromSupabase();
  }, [packId]);

  if (loading) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!packInfo) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Paket bulunamadı
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{packInfo.name}</CardTitle>
        <CardDescription>Supabase'den dinamik yüklendi</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          onClick={() => addToWhatsApp(packInfo)}
          disabled={isLoading}
          className="w-full"
        >
          WhatsApp'a Ekle
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Örnek 4: Çoklu Paket Yönetimi
 */
export function MultiplePacksExample() {
  const packs = [
    examplePackInfo,
    { ...examplePackInfo, identifier: 'kloze_cute_001', name: 'Sevimli Stickerlar' },
    { ...examplePackInfo, identifier: 'kloze_meme_001', name: 'Meme Stickerlar' }
  ];

  return (
    <div className="space-y-4">
      {packs.map((pack) => (
        <Card key={pack.identifier}>
          <CardHeader>
            <CardTitle className="text-lg">{pack.name}</CardTitle>
            <CardDescription>
              {pack.stickers.length} sticker
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <AddToWhatsAppButton
              packInfo={pack}
              variant="outline"
              size="sm"
              className="w-full"
            >
              WhatsApp'a Ekle
            </AddToWhatsAppButton>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
