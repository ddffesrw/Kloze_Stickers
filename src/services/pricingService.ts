import { supabase } from '@/lib/supabase';

export interface PricingPlan {
    id: string;
    type: 'credits' | 'subscription';
    name: string;
    description: string | null;
    credits_amount: number;
    price: number;
    original_price: number | null;
    currency: string;
    duration_days: number;
    badge: string | null;
    emoji: string;
    color: string;
    sort_order: number;
    is_campaign: boolean;
    campaign_end_date: string | null;
    campaign_name: string | null;
    is_active: boolean;
}

/**
 * Get all active pricing plans
 */
export async function getActivePricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching pricing plans:', error);
        return [];
    }

    return data || [];
}

/**
 * Get credit packages only
 */
export async function getCreditPackages(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'credits')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching credit packages:', error);
        return [];
    }

    return data || [];
}

/**
 * Get subscription plans only
 */
export async function getSubscriptionPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'subscription')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching subscription plans:', error);
        return [];
    }

    return data || [];
}

/**
 * Get active campaigns
 */
export async function getActiveCampaigns(): Promise<PricingPlan[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .eq('is_active', true)
        .eq('is_campaign', true)
        .or(`campaign_end_date.is.null,campaign_end_date.gt.${now}`)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error fetching campaigns:', error);
        return [];
    }

    return data || [];
}

// ============ ADMIN FUNCTIONS ============

/**
 * Get all pricing plans (admin)
 */
export async function adminGetAllPricingPlans(): Promise<PricingPlan[]> {
    const { data, error } = await supabase
        .from('pricing_plans')
        .select('*')
        .order('type', { ascending: true })
        .order('sort_order', { ascending: true });

    if (error) {
        if (error.code === '42501') {
            console.error('Permission denied fetching pricing plans. Ensure the current user has admin privileges and RLS policies allow access.', error);
            // Return empty array to avoid crashing UI, or rethrow if you want UI to show error state
            return [];
        }
        console.error('Error fetching all pricing plans:', error);
        return [];
    }

    return data || [];
}

/**
 * Create a new pricing plan (admin)
 */
export async function adminCreatePricingPlan(plan: Partial<PricingPlan>): Promise<PricingPlan | null> {
    const { data, error } = await supabase
        .from('pricing_plans')
        .insert(plan)
        .select()
        .single();

    if (error) {
        console.error('Error creating pricing plan:', error);
        throw error;
    }

    return data;
}

/**
 * Update a pricing plan (admin)
 */
export async function adminUpdatePricingPlan(id: string, updates: Partial<PricingPlan>): Promise<PricingPlan | null> {
    const { data, error } = await supabase
        .from('pricing_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating pricing plan:', error);
        throw error;
    }

    return data;
}

/**
 * Delete a pricing plan (admin)
 */
export async function adminDeletePricingPlan(id: string): Promise<boolean> {
    const { error } = await supabase
        .from('pricing_plans')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting pricing plan:', error);
        return false;
    }

    return true;
}

/**
 * Toggle plan active status (admin)
 */
export async function adminTogglePlanStatus(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
        .from('pricing_plans')
        .update({ is_active: isActive })
        .eq('id', id);

    if (error) {
        console.error('Error toggling plan status:', error);
        return false;
    }

    return true;
}

/**
 * Start a campaign (admin)
 */
export async function adminStartCampaign(
    id: string,
    campaignName: string,
    discountedPrice: number,
    endDate?: string
): Promise<boolean> {
    const { error } = await supabase
        .from('pricing_plans')
        .update({
            is_campaign: true,
            campaign_name: campaignName,
            original_price: null, // Will be set from current price
            price: discountedPrice,
            campaign_end_date: endDate || null
        })
        .eq('id', id);

    if (error) {
        console.error('Error starting campaign:', error);
        return false;
    }

    return true;
}

/**
 * End a campaign (admin)
 */
export async function adminEndCampaign(id: string, originalPrice: number): Promise<boolean> {
    const { error } = await supabase
        .from('pricing_plans')
        .update({
            is_campaign: false,
            campaign_name: null,
            campaign_end_date: null,
            price: originalPrice,
            original_price: null
        })
        .eq('id', id);

    if (error) {
        console.error('Error ending campaign:', error);
        return false;
    }

    return true;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscount(price: number, originalPrice: number | null): number {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = 'TRY'): string {
    if (currency === 'TRY') {
        return `₺${price.toFixed(2)}`;
    }
    return `$${price.toFixed(2)}`;
}
