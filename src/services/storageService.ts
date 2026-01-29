
import { supabase } from '@/lib/supabase';

/**
 * Storage Bucket Names
 */
export const BUCKETS = {
    STICKERS: 'stickers',
    THUMBNAILS: 'thumbnails',
};

/**
 * Storage Helpers
 */
export const storageService = {
    /**
     * Get public URL for a file in storage
     */
    getPublicUrl: (bucket: string, path: string) => {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data.publicUrl;
    },

    /**
     * Detect content type from file or path
     */
    getContentType: (file: File | Blob, path: string): string => {
        // First check if file has a type
        if (file.type && file.type !== 'application/octet-stream') {
            return file.type;
        }

        // Fallback to extension-based detection
        const extension = path.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            'webp': 'image/webp',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
        };

        return mimeTypes[extension || ''] || 'image/webp';
    },

    /**
     * Upload file to storage
     */
    upload: async (bucket: string, path: string, file: File | Blob) => {
        const contentType = storageService.getContentType(file, path);

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(path, file, {
                cacheControl: '3600',
                upsert: false,
                contentType
            });

        if (error) throw error;
        return {
            ...data,
            publicUrl: storageService.getPublicUrl(bucket, path)
        };
    },

    /**
     * Delete file from storage
     */
    delete: async (bucket: string, paths: string[]) => {
        const { data, error } = await supabase.storage
            .from(bucket)
            .remove(paths);

        if (error) throw error;
        return data;
    },

    /**
     * Helper: Extract storage path from URL
     */
    getPathFromUrl: (url: string | null): string | null => {
        if (!url) return null;
        try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            // Standard supabase public url structure:
            // /storage/v1/object/public/{bucket}/{path}

            const publicIndex = pathParts.indexOf('public');
            if (publicIndex !== -1 && publicIndex + 2 < pathParts.length) {
                // bucket is pathParts[publicIndex + 1]
                // path is everything after
                return pathParts.slice(publicIndex + 2).join('/');
            }
            return null;
        } catch (e) {
            return null;
        }
    }
};
