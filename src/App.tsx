import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BottomNav } from "@/components/kloze/BottomNav";
import HomePage from "./pages/HomePage";
import PackDetailPage from "./pages/PackDetailPage";
import GeneratePage from "./pages/GeneratePage";
import SearchPage from "./pages/SearchPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import GetCreditsPage from "./pages/GetCreditsPage";
import DashboardPage from "./pages/DashboardPage";
import AuthPage from "./pages/AuthPage";
import LegalPage from "./pages/LegalPage";
import NotFound from "./pages/NotFound";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Route Guard Components
const ProtectedRoute = ({ session, children }: { session: Session | null, children: React.ReactNode }) => {
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ session, children }: { session: Session | null, children: React.ReactNode }) => {
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="dark min-h-screen bg-background">
            <Routes>
              {/* Public Routes */}
              <Route path="/auth" element={<PublicRoute session={session}><AuthPage /></PublicRoute>} />
              <Route path="/legal" element={<LegalPage />} />

              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute session={session}><HomePage /></ProtectedRoute>} />
              <Route path="/pack/:id" element={<ProtectedRoute session={session}><PackDetailPage /></ProtectedRoute>} />
              <Route path="/generate" element={<ProtectedRoute session={session}><GeneratePage /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute session={session}><SearchPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute session={session}><ProfilePage /></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute session={session}><GetCreditsPage /></ProtectedRoute>} />
              <Route path="/admin-dashboard" element={<ProtectedRoute session={session}><AdminPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute session={session}><AdminPage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Show BottomNav only if authenticated */}
            {session && <BottomNav />}
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
