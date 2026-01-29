/**
 * Supabase Client
 * Database ve Storage erişimi için
 */

import { createClient } from '@supabase/supabase-js';

// Supabase URL ve Anon Key'i environment variables'dan al
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database Types
 */
export interface Database {
  public: {
    Tables: {
      sticker_packs: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          publisher: string;
          creator_id: string;
          creator_name: string;
          creator_avatar: string;
          cover_image_url: string;
          tray_image_url: string;
          category: string;
          is_premium: boolean;
          downloads: number;
          likes_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sticker_packs']['Row'], 'id' | 'created_at' | 'updated_at' | 'downloads' | 'likes_count'>;
        Update: Partial<Database['public']['Tables']['sticker_packs']['Insert']>;
      };
      stickers: {
        Row: {
          id: string;
          pack_id: string;
          image_url: string;
          emojis: string[];
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['stickers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['stickers']['Insert']>;
      };
      user_stickers: {
        Row: {
          id: string;
          user_id: string;
          pack_id: string | null;
          image_url: string;
          thumbnail_url: string;
          prompt: string;
          seed: number;
          width: number;
          height: number;
          size_bytes: number;
          emojis: string[];
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_stickers']['Row'], 'id' | 'created_at' | 'sort_order'>;
        Update: Partial<Database['public']['Tables']['user_stickers']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string;
          credits: number;
          is_pro: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      pack_likes: {
        Row: {
          id: string;
          user_id: string;
          pack_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pack_likes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['pack_likes']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url: string;
          credits: number;
          is_pro: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
    };
  };
}

/**
 * Storage helpers
 */
export const storage = {
  /**
   * Get public URL for a file in storage
   */
  getPublicUrl: (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },

  /**
   * Upload file to storage
   */
  upload: async (bucket: string, path: string, file: File | Blob) => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
    return data;
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
  }
};

/**
 * Auth helpers
 */
export const auth = {
  /**
   * Get current user
   */
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Sign in with email
   */
  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign up with email
   */
  signUpWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out
   */
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }
};
