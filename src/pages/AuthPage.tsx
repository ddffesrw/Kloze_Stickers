import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Chrome, Apple } from "lucide-react"; // Chrome as Google placeholder if needed, or simple text
import { toast } from "sonner";

export default function AuthPage() {
    const [loading, setLoading] = useState(false);

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/`, // Redirect back to home
                },
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
            {/* Dynamic Background */}
            <div className="fixed inset-0 mesh-gradient-intense opacity-60 pointer-events-none" />

            {/* Animated Floating Stickers */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-10 left-10 text-6xl animate-float opacity-80" style={{ animationDuration: '8s' }}>🎨</div>
                <div className="absolute bottom-20 right-10 text-6xl animate-float-delayed opacity-80" style={{ animationDuration: '10s' }}>🚀</div>
                <div className="absolute top-1/3 right-20 text-5xl animate-float opacity-60" style={{ animationDuration: '12s' }}>✨</div>
                <div className="absolute bottom-1/3 left-20 text-5xl animate-float-delayed opacity-60" style={{ animationDuration: '9s' }}>🔥</div>
                <div className="absolute top-1/2 left-1/2 text-8xl opacity-10 blur-xl animate-pulse">KLOZE</div>
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
                        disabled={loading}
                        className="w-full h-14 rounded-2xl bg-white text-black hover:bg-gray-100 border border-gray-200 font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                        Google ile Devam Et
                    </Button>

                    <Button
                        onClick={() => handleSocialLogin('apple')}
                        disabled={loading}
                        className="w-full h-14 rounded-2xl bg-black text-white hover:bg-gray-900 font-bold text-lg transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                    >
                        <Apple className="w-6 h-6" />
                        Apple ile Devam Et
                    </Button>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-xs text-muted-foreground/60">
                        Devam ederek Kullanım Koşulları ve Gizlilik Politikasını kabul etmiş olursunuz.
                    </p>
                </div>
            </div>
        </div>
    );
}
