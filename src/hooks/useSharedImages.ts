/**
 * useSharedImages Hook
 * Diğer uygulamalardan (WhatsApp, Galeri vb.) paylaşılan görselleri dinler
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface SharedImagesEvent {
  detail: {
    images: string[];  // Base64 encoded images
    count: number;
  };
}

interface SharedImageData {
  images: string[];
  count: number;
  timestamp: number;
}

// Global state for shared images (persists across component mounts)
let pendingSharedImages: SharedImageData | null = null;

export function useSharedImages() {
  const [sharedImages, setSharedImages] = useState<string[]>([]);
  const navigate = useNavigate();

  const clearSharedImages = useCallback(() => {
    setSharedImages([]);
    pendingSharedImages = null;
  }, []);

  useEffect(() => {
    // Check for pending shared images on mount
    if (pendingSharedImages) {
      setSharedImages(pendingSharedImages.images);
    }

    const handleSharedImages = (event: CustomEvent<SharedImagesEvent['detail']>) => {
      const { images, count } = event.detail;

      console.log(`📥 ${count} görsel paylaşıldı`);

      if (images && images.length > 0) {
        // Store in global state
        pendingSharedImages = {
          images,
          count,
          timestamp: Date.now()
        };

        setSharedImages(images);

        // Show toast notification
        toast.success(`${count} görsel alındı!`, {
          description: 'Sticker paketine ekleyebilirsiniz',
          action: {
            label: 'Pakete Ekle',
            onClick: () => navigate('/create-pack')
          }
        });

        // Navigate to create pack page
        navigate('/create-pack', {
          state: { sharedImages: images }
        });
      }
    };

    // Listen for shared images event
    window.addEventListener('sharedImages', handleSharedImages as EventListener);

    return () => {
      window.removeEventListener('sharedImages', handleSharedImages as EventListener);
    };
  }, [navigate]);

  return {
    sharedImages,
    hasSharedImages: sharedImages.length > 0,
    clearSharedImages
  };
}

/**
 * Convert base64 to File object
 */
export function base64ToFile(base64: string, filename: string = 'shared-image.png'): File {
  // Add data URL prefix if not present
  const dataUrl = base64.startsWith('data:')
    ? base64
    : `data:image/png;base64,${base64}`;

  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}

/**
 * Get pending shared images (for use in components that don't use the hook)
 */
export function getPendingSharedImages(): string[] | null {
  if (pendingSharedImages && Date.now() - pendingSharedImages.timestamp < 5 * 60 * 1000) {
    return pendingSharedImages.images;
  }
  return null;
}

/**
 * Clear pending shared images
 */
export function clearPendingSharedImages(): void {
  pendingSharedImages = null;
}
