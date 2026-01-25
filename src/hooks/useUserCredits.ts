import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

    const invalidateCredits = () => {
        queryClient.invalidateQueries({ queryKey: ['userCredits'] });
    };

    return { credits, isLoading, refetch, invalidateCredits };
}
