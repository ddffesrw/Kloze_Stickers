import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { auth } from '@/lib/supabase';

export function useUserCredits() {
    const queryClient = useQueryClient();

    const fetchCredits = async () => {
        const user = await auth.getCurrentUser();
        if (!user) return 0;

        const { data, error } = await supabase
            .from('users')
            .select('credits')
            .eq('id', user.id)
            .single();

        if (error) throw error;
        return data?.credits || 0;
    };

    const { data: credits = 0, isLoading, refetch } = useQuery({
        queryKey: ['userCredits'],
        queryFn: fetchCredits
    });

    // Realtime Listener
    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const setupRealtime = async () => {
            const user = await auth.getCurrentUser();
            if (!user) return;

            channel = supabase
                .channel('credit-updates')
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'users',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('Credit update received:', payload);
                        queryClient.invalidateQueries({ queryKey: ['userCredits'] });
                    }
                )
                .subscribe();
        };

        setupRealtime();

        return () => {
            if (channel) supabase.removeChannel(channel);
        };
    }, [queryClient]);

    return { credits, isLoading, refetch, invalidateCredits };
}
