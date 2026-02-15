import { supabase } from '@/lib/supabase';

/**
 * Add Credits to User (Admin Only)
 */
export async function adminAddCredits(userId: string, amount: number) {
    const { data, error } = await supabase.rpc('admin_add_credits', {
        target_user_id: userId,
        amount_to_add: amount,
        update_reason: 'Admin Panel Gift'
    });

    if (error) {
        console.error("Admin add credits error:", error);
        throw error;
    }
    return data;
}

/**
 * Toggle Pro Status (Admin Only)
 * Now directly updates profiles table instead of RPC
 */
export async function adminTogglePro(userId: string, status: boolean) {
    // Direct update to profiles table
    const { data, error } = await supabase
        .from('profiles')
        .update({ is_pro: status })
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error("Admin toggle pro error:", error);
        throw error;
    }

    console.log("Pro status updated:", { userId, status, result: data });
    return data;
}

/**
 * Get All Users (Admin View)
 * Replacing mock data usage
 */
export async function adminGetAllUsers() {
    const { data, error } = await supabase.rpc('admin_get_all_users');

    if (error) throw error;
    return data;
}
