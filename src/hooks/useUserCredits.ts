import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/supabase';

export function useUserCredits() {
    const queryClient = useQueryClient();

    const fetchCredits = async () => {
        const user = await auth.getCurrentUser();
        if (!user) return 0;

        // Use RPC to avoid 403 on direct table access
        const { data, error } = await supabase.rpc('get_user_credits');

        if (error) {
            console.error('Error fetching credits:', error);
            return 0;
        }
        return data || 0;
    };

    const { data: credits = 0, isLoading, refetch } = useQuery({
        queryKey: ['userCredits'],
        queryFn: fetchCredits
    });

    // Realtime Listener (Optional: might still fail on 'users' table if RLS blocks SUBSCRIPTION)
    // If getting 403 on subscription, better to rely on manual invalidation or a different trigger.
    // For now, let's keep it simple and invalidation-based from actions.
    // If strict RLS blocks 'users' select, it probably blocks 'users' subscription too.
    // We will comment out the realtime part for 'users' table to avoid console errors,
    // relying on 'invalidateCredits' called after generation/purchase.

    /* 
    useEffect(() => {
        const channel = supabase.channel('credit-updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
                queryClient.invalidateQueries({ queryKey: ['userCredits'] });
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [queryClient]); 
    */

    const invalidateCredits = () => {
        queryClient.invalidateQueries({ queryKey: ['userCredits'] });
    };

    return { credits, isLoading, refetch, invalidateCredits };
}
