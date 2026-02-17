import { useState, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { BottomNav } from "@/components/kloze/BottomNav";
import { EmojiSplash } from "@/components/kloze/EmojiSplash";
import "@/i18n/config"; // Initialize i18n

// Critical pages - eagerly loaded
import HomePage from "./pages/HomePage";
import PackDetailPage from "./pages/PackDetailPage";
import SearchPage from "./pages/SearchPage";
import AuthPage from "./pages/AuthPage";

// Lazy loaded pages - reduces initial bundle size
const GeneratePage = lazy(() => import("./pages/GeneratePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const GetCreditsPage = lazy(() => import("./pages/GetCreditsPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const GalleryUploadPage = lazy(() => import("./pages/GalleryUploadPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const NotFound = lazy(() => import("./pages/NotFound"));
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { adMobService } from "@/services/adMobService";
import { monetizationService } from "@/services/monetizationService";
import { firebaseService } from "@/services/firebaseService";
import { DailyBonusModal } from "@/components/kloze/DailyBonusModal";
import { OnboardingModal, useOnboarding } from "@/components/kloze/OnboardingModal";
import { OfflineIndicator } from "@/components/kloze/OfflineIndicator";
import { ErrorBoundary } from "@/components/kloze/ErrorBoundary";
import { AppReviewPrompt } from "@/components/kloze/AppReviewPrompt";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { isAdminAvailable } from "@/lib/platform";
import { useSharedImages } from "@/hooks/useSharedImages";
import { toast } from "sonner";
import { getGuestCredits, setGuestCredits } from "@/components/kloze/WatchAdButton";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 dakika - gereksiz refetch'leri önler
      gcTime: 10 * 60 * 1000, // 10 dakika cache
      refetchOnWindowFocus: false, // Mobilde sürekli tetikleniyor, kapat
      retry: 1, // Tek retry yeterli
    },
  },
});

// Shared Images Listener (must be inside BrowserRouter)
const SharedImagesListener = () => {
  useSharedImages(); // This hook handles navigation when images are shared
  return null;
};

// Route Guard Components
const ProtectedRoute = ({ session, children }: { session: Session | null, children: React.ReactNode }) => {
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ session, children }: { session: Session | null, children: React.ReactNode }) => {
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

// Web Gate: blocks non-admin users on web platform
const WebGate = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="dark min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #12081f 40%, #0a0f1a 100%)' }}>
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-6">📱</div>
        <h1 className="text-2xl font-black text-white mb-3">KLOZE Stickers</h1>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          KLOZE Stickers mobil uygulama olarak tasarlanmıştır.
          En iyi deneyim için uygulamayı indirin.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="https://play.google.com/store/apps/details?id=com.klozestickers.app"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-block py-3 px-6 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200 transition-colors"
          >
            Google Play'den Indir
          </a>
          {children}
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [authCallbackInProgress, setAuthCallbackInProgress] = useState(false);
  const { showOnboarding, completeOnboarding } = useOnboarding();

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch((err) => {
      console.error('getSession failed:', err);
      setLoading(false); // Don't block app on auth failure
    });

    // Safety: Force loading=false after 5s to prevent black screen
    const safetyTimeout = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('[App] Safety timeout: forcing loading=false');
        return false;
      });
    }, 5000);

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Fire-and-forget: Don't block auth state change with async operations
      // This prevents blocking getSession() and causing black screen
      if (session?.user) {
        const userId = session.user.id;

        // 1. Sync guest credits (non-blocking)
        const guestCredits = getGuestCredits();
        if (guestCredits > 0) {
          console.log("Syncing guest credits:", guestCredits);
          supabase.rpc('add_credits', {
            user_id: userId,
            amount: guestCredits
          }).then(({ error }) => {
            if (!error) {
              setGuestCredits(0);
              localStorage.removeItem('guest_credits_sig');
              setTimeout(() => {
                toast.success(`${guestCredits} misafir kredin hesabına eklendi! 🎉`);
              }, 1000);
            } else {
              console.error("Credit sync failed:", error);
            }
          }).catch(e => console.error("Credit sync error:", e));
        }

        // 2. Pro monthly credits (non-blocking)
        supabase.rpc('give_monthly_pro_credits').then(({ data: monthlyCredits }) => {
          if (monthlyCredits && monthlyCredits > 0) {
            setTimeout(() => {
              toast.success(`Aylık ${monthlyCredits} Pro kredin hesabına eklendi! 👑`, {
                description: 'Sticker üretmek için kullanabilirsin'
              });
            }, 2000);
          }
        }).catch(e => console.log("Monthly credits check skipped:", e));
      }
    });

    // 3. Handle Deep Links (Capacitor) - For auth callback
    // Register listener SYNCHRONOUSLY to catch early events
    if (Capacitor.isNativePlatform()) {
      const handleAppUrlOpen = async ({ url }: { url: string }) => {
        console.log('App received deep link:', url);

        if (url.includes('login-callback')) {
          // Mark auth callback in progress to prevent route guards from redirecting
          setAuthCallbackInProgress(true);

          try {
            // Close browser when auth callback is received
            try {
              await Browser.close();
            } catch (e) {
              console.log('Browser already closed');
            }

            // Parse tokens from hash fragment
            const hashIndex = url.indexOf('#');
            const queryIndex = url.indexOf('?');
            const paramsStart = hashIndex !== -1 ? hashIndex + 1 : (queryIndex !== -1 ? queryIndex + 1 : -1);

            let authSuccess = false;

            if (paramsStart !== -1) {
              const paramsStr = url.substring(paramsStart);
              const params = new URLSearchParams(paramsStr);
              const access_token = params.get('access_token');
              const refresh_token = params.get('refresh_token');
              const code = params.get('code');

              console.log('Parsed tokens:', { hasAccessToken: !!access_token, hasRefreshToken: !!refresh_token, hasCode: !!code });

              if (access_token && refresh_token) {
                const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                if (error) {
                  console.error('Session set error:', error);
                } else {
                  console.log('Session set successfully!');
                  // Manually fetch and set session to ensure React state updates immediately
                  const { data: { session: newSession } } = await supabase.auth.getSession();
                  if (newSession) {
                    setSession(newSession);
                    authSuccess = true;
                  }
                }
              } else if (code) {
                const { error } = await supabase.auth.exchangeCodeForSession(code);
                if (error) {
                  console.error('Code exchange error:', error);
                } else {
                  // Manually fetch and set session after code exchange
                  const { data: { session: newSession } } = await supabase.auth.getSession();
                  if (newSession) {
                    setSession(newSession);
                    authSuccess = true;
                  }
                }
              }
            }

            // If auth failed, wait briefly for onAuthStateChange to fire as fallback
            if (!authSuccess) {
              console.warn('Auth callback: manual session set failed, waiting for onAuthStateChange...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

          } catch (error) {
            console.error('Auth callback error:', error);
          } finally {
            // ALWAYS reset - prevents infinite splash screen
            setAuthCallbackInProgress(false);
          }
        }
      };

      CapacitorApp.addListener('appUrlOpen', handleAppUrlOpen);

      // Fallback: Browser kapandığında session kontrol et
      // MIUI/Redmi cihazlarda deep link tetiklenmeyebilir,
      // ama browser kapandıktan sonra session Supabase tarafında oluşmuş olabilir
      Browser.addListener('browserFinished', async () => {
        console.log('[App] Browser finished, checking session as fallback...');
        // Kısa gecikme - Supabase'in session'ı işlemesi için
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            console.log('[App] Session found after browser closed!');
            setSession(currentSession);
          }
        } catch (e) {
          console.warn('[App] Session check after browser close failed:', e);
        }
      });
    }

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.removeAllListeners();
        Browser.removeAllListeners();
      }
    };
  }, []);

  // Monetization & Firebase Init
  // NOTE: AdMob is lazy-initialized when user first clicks "Watch Ad" button
  // Initializing it on app startup causes crash (ads.dynamite module forces process kill)
  useEffect(() => {
    const initServices = async () => {
      await monetizationService.initialize();
      await firebaseService.initialize();
    };
    initServices();
  }, []);

  // Set Firebase user ID when session changes
  useEffect(() => {
    if (session?.user?.id) {
      firebaseService.setUserId(session.user.id);
    }
  }, [session?.user?.id]);

  // Auth callback: show minimal spinner instead of full splash
  if (authCallbackInProgress) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #12081f 40%, #0a0f1a 100%)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-violet-300/70 font-medium">Giriş yapılıyor...</p>
        </div>
      </div>
    );
  }

  // Show splash animation on initial app load only
  if (loading || showSplash) {
    return (
      <div className="dark min-h-screen bg-background">
        <EmojiSplash onComplete={() => {
          setShowSplash(false);
        }} duration={2500} />
      </div>
    );
  }

  // Show onboarding for new users (after splash, before main app)
  if (showOnboarding && !loading && !showSplash) {
    return (
      <div className="dark">
        <OnboardingModal onComplete={completeOnboarding} />
      </div>
    );
  }

  // Web platform gate
  const isWebPlatform = !Capacitor.isNativePlatform();
  const ADMIN_EMAIL = "johnaxe.storage@gmail.com";
  const isAdminUser = session?.user?.email === ADMIN_EMAIL;

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider session={session} loading={loading}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <BrowserRouter>
            <SharedImagesListener />
            <div className="min-h-screen bg-background">
              <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
              <Routes>
                {/* Auth - redirect to home if already logged in */}
                <Route path="/auth" element={<PublicRoute session={session}><AuthPage /></PublicRoute>} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />

                {/* Web gate: non-admin users see download prompt */}
                {isWebPlatform && !isAdminUser ? (
                  <Route path="*" element={<WebGate><Link to="/auth" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-2">Yönetici Girişi</Link></WebGate>} />
                ) : (
                  <>
                    {/* Guest Accessible Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/pack/:id" element={<PackDetailPage />} />
                    <Route path="/search" element={<SearchPage />} />

                    {/* Protected Routes */}
                    <Route path="/generate" element={<ProtectedRoute session={session}><GeneratePage /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute session={session}><ProfilePage /></ProtectedRoute>} />
                    <Route path="/gallery-upload" element={<ProtectedRoute session={session}><GalleryUploadPage /></ProtectedRoute>} />
                    <Route path="/credits" element={<ProtectedRoute session={session}><GetCreditsPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute session={session}><SettingsPage /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    {isAdminAvailable() && (
                      <>
                        <Route path="/admin-dashboard" element={<ProtectedRoute session={session}><AdminPage /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute session={session}><AdminPage /></ProtectedRoute>} />
                      </>
                    )}

                    {/* Fallback */}
                    <Route path="*" element={<NotFound />} />
                  </>
                )}
              </Routes>
              </Suspense>
              {/* Show BottomNav for all users */}
              <BottomNav />

              {/* Daily Bonus Modal - only for authenticated users */}
              {session?.user?.id && (
                <DailyBonusModal userId={session.user.id} />
              )}

              {/* App Review Prompt - show after some usage */}
              {session && <AppReviewPrompt minActions={5} minDays={2} />}
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
