import { supabase } from '@/lib/supabase';

export interface Category {
    id: string;
    name: string;
    emoji: string;
    sort_order: number;
    is_active: boolean;
}

/**
 * Get all active categories ordered by sort_order
 */
export async function getAllCategories(): Promise<Category[]> {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
    return data || [];
}

/**
 * Create a new category (Admin only)
 */
export async function createCategory(name: string, emoji: string): Promise<Category | null> {
    // Get max sort order
    const { data: maxOrderData } = await supabase
        .from('categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const nextOrder = (maxOrderData?.sort_order || 0) + 1;

    const { data, error } = await supabase
        .from('categories')
        .insert({ name, emoji, sort_order: nextOrder })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete category (Soft delete or Hard delete)
 * For now, we'll hard delete, but in production soft delete is safer.
 */
export async function deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
