import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { getGuestCredits } from '@/components/kloze/WatchAdButton';

interface AuthContextType {
  session: Session | null;
  userId: string;
  credits: number;
  isPro: boolean;
  isLoading: boolean;
  refreshCredits: () => Promise<void>;
  setCreditsLocal: (credits: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  userId: '',
  credits: 0,
  isPro: false,
  isLoading: true,
  refreshCredits: async () => {},
  setCreditsLocal: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
  session: Session | null;
  loading: boolean;
}

export function AuthProvider({ children, session, loading }: AuthProviderProps) {
  const [credits, setCredits] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const userId = session?.user?.id || '';

  // Fetch profile when user changes
  useEffect(() => {
    if (!userId) {
      // Guest user - read from localStorage
      const guestCredits = getGuestCredits();
      setCredits(guestCredits);
      setIsPro(false);
      setProfileLoaded(true);

      // Listen for guest credit updates
      const handleGuestUpdate = () => {
        setCredits(getGuestCredits());
      };
      window.addEventListener('guest-credits-updated', handleGuestUpdate);

      return () => {
        window.removeEventListener('guest-credits-updated', handleGuestUpdate);
      };
    }

    let cancelled = false;

    const fetchProfile = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits, is_pro')
        .eq('id', userId)
        .single();

      if (!cancelled && profile) {
        setCredits(profile.credits || 0);
        setIsPro(profile.is_pro || false);
      }
      if (!cancelled) setProfileLoaded(true);
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [userId]);

  const refreshCredits = useCallback(async () => {
    if (!userId) {
      // Guest - refresh from localStorage
      setCredits(getGuestCredits());
      return;
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, is_pro')
      .eq('id', userId)
      .single();
    if (profile) {
      setCredits(profile.credits || 0);
      setIsPro(profile.is_pro || false);
    }
  }, [userId]);

  const setCreditsLocal = useCallback((c: number) => {
    setCredits(c);
  }, []);

  return (
    <AuthContext.Provider value={{
      session,
      userId,
      credits,
      isPro,
      isLoading: loading || (!profileLoaded && !!userId),
      refreshCredits,
      setCreditsLocal,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
