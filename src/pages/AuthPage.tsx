import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Chrome, Apple, Check, Wand2, Sparkles, Palette, Zap } from "lucide-react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import ExternalBrowser from "@/plugins/external-browser";

export default function AuthPage() {
    const [loading, setLoading] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Deep link handling is done in App.tsx - no duplicate listener here

    // Reset loading state when component regains focus (user returns from browser)
    // or when auth state changes. This prevents stuck loading buttons.
    useEffect(() => {
        // On native: listen for app resume (user closed browser or came back)
        if (Capacitor.isNativePlatform()) {
            const resumeHandler = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    // Deep link tetiklenmemiş olabilir (özellikle MIUI/Redmi cihazlarda)
                    // Session'ı aktif olarak kontrol et - fallback mekanizması
                    setTimeout(async () => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (session) {
                                console.log('[AuthPage] Session found on resume');
                            }
                        } catch (e) {
                            console.warn('[AuthPage] Session check failed:', e);
                        }
                        setLoading(false);
                    }, 2000);
                }
            });

            return () => {
                resumeHandler.then(h => h.remove());
            };
        } else {
            // On web: listen for auth state change to reset loading
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
                setLoading(false);
            });

            return () => {
                subscription.unsubscribe();
            };
        }
    }, []);

    // Safety timeout: always reset loading after 30s to prevent permanent stuck state
    useEffect(() => {
        if (loading) {
            loadingTimeoutRef.current = setTimeout(() => {
                console.warn('[AuthPage] Loading timeout reached, resetting...');
                setLoading(false);
            }, 30000);
        } else {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
                loadingTimeoutRef.current = null;
            }
        }

        return () => {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
        };
    }, [loading]);

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        try {
            setLoading(true);

            // Google: Browser-based flow (due to plugin installation issues)
            // Enhanced with ExternalBrowser plugin for reliable redirects
            if (provider === 'google') {
                const redirectTo = Capacitor.isNativePlatform()
                    ? 'com.klozestickers.app://login-callback'
                    : window.location.origin;

                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo,
                        skipBrowserRedirect: Capacitor.isNativePlatform(),
                        queryParams: {
                            access_type: 'offline',
                            prompt: 'consent',
                        },
                    },
                });

                if (error) throw error;

                if (Capacitor.isNativePlatform() && data?.url) {
                    await ExternalBrowser.open({ url: data.url });
                }
                return;
            }

            // Apple: Native Sign-In
            if (provider === 'apple') {
                if (Capacitor.isNativePlatform()) {
                    const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
                    const result = await SignInWithApple.authorize({
                        clientId: 'com.klozestickers.app',
                        scopes: 'email name',
                        redirectURI: 'https://cxujdireegrurfyhhocz.supabase.co/auth/v1/callback',
                    });

                    if (result.response && result.response.identityToken) {
                        const { error } = await supabase.auth.signInWithIdToken({
                            provider: 'apple',
                            token: result.response.identityToken,
                            nonce: 'NONCE', // Supabase requires nonce for Apple? Usually optional or handled by SDK
                        });
                        if (error) throw error;
                    } else {
                        throw new Error('Apple Sign-In failed');
                    }
                } else {
                    // Web fallback for Apple
                    const { error } = await supabase.auth.signInWithOAuth({
                        provider: 'apple',
                        options: { redirectTo: window.location.origin }
                    });
                    if (error) throw error;
                }
            }
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
            {/* Dynamic Background */}
            <div className="fixed inset-0 mesh-gradient-intense opacity-60 pointer-events-none" />

            {/* Premium Ambient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* 1. Dynamic Gradient Orbs - Optimized */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[80px]" />
                <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[60px]" />

                {/* 2. Floating Glass Elements (Premium Icons) - Optimized Blur */}
                <div className="absolute top-[15%] left-[8%] animate-float will-change-transform" style={{ animationDuration: '6s' }}>
                    <div className="p-4 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 shadow-lg shadow-purple-500/5 rotate-[-12deg]">
                        <Palette className="w-8 h-8 text-purple-300 drop-shadow-md" />
                    </div>
                </div>

                <div className="absolute bottom-[20%] right-[10%] animate-float-delayed will-change-transform" style={{ animationDuration: '8s' }}>
                    <div className="p-5 rounded-[2rem] bg-white/5 backdrop-blur-md border border-white/10 shadow-lg shadow-amber-500/5 rotate-[12deg]">
                        <Wand2 className="w-10 h-10 text-amber-300 drop-shadow-md" />
                    </div>
                </div>

                <div className="absolute top-[25%] right-[15%] animate-float will-change-transform" style={{ animationDuration: '10s' }}>
                    <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-md shadow-blue-500/5 rotate-[6deg]">
                        <Sparkles className="w-6 h-6 text-blue-300 drop-shadow-md" />
                    </div>
                </div>

                <div className="absolute bottom-[15%] left-[15%] animate-float-delayed will-change-transform" style={{ animationDuration: '9s' }}>
                    <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-md shadow-green-500/5 rotate-[-6deg]">
                        <Zap className="w-5 h-5 text-green-300 drop-shadow-md" />
                    </div>
                </div>
            </div>

            {/* Glass Card */}
            <div className="relative z-10 w-full max-w-md p-8 rounded-[32px] glass-card border border-white/20 shadow-2xl backdrop-blur-xl">
                <div className="text-center mb-8">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-3xl flex items-center justify-center shadow-lg glow-violet mb-6 transform rotate-3">
                        <span className="text-4xl text-white">💎</span>
                    </div>
                    <h1 className="text-3xl font-black gradient-text mb-2">KLOZE</h1>
                    <p className="text-muted-foreground font-medium">AI Sticker Studio'ya Hoşgeldin</p>
                </div>

                <div className="space-y-4">
                    <Button
                        onClick={() => handleSocialLogin('google')}
                        disabled={loading || !agreed}
                        className="w-full h-14 rounded-2xl bg-white text-black hover:bg-gray-100 border border-gray-200 font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                        Google ile Devam Et
                    </Button>

                    <Button
                        onClick={() => handleSocialLogin('apple')}
                        disabled={loading || !agreed}
                        className="w-full h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        <Apple className="w-6 h-6" />
                        Apple ile Devam Et
                    </Button>
                </div>

                <div className="mt-8 space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setAgreed(!agreed)}>
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${agreed ? 'bg-primary border-primary' : 'border-white/30'}`}>
                            {agreed && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                            <Link to="/terms" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline underline-offset-4">Kullanım Koşulları</Link> ve <Link to="/privacy" onClick={(e) => e.stopPropagation()} className="text-primary hover:underline underline-offset-4">Gizlilik Politikası</Link>'nı okudum ve kabul ediyorum.
                        </p>
                    </div>
                </div>

                <div className="mt-4 text-center">
                    {!agreed && <p className="text-[10px] text-primary/80 animate-pulse">Devam etmek için kutucuğu işaretleyin</p>}
                </div>
            </div>
        </div>
    );
}
