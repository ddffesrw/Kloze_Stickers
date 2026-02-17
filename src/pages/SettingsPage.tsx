
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ChevronLeft,
    Bell,
    Moon,
    Shield,
    HelpCircle,
    LogOut,
    Trash2,
    Mail,
    FileText,
    Smartphone,
    Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { LanguageSelector } from "@/components/kloze/LanguageSelector";
import { useTranslation } from "react-i18next";
// import { useTheme } from "@/components/theme-provider"; // Removed as file likely missing

// function SettingsPage...
export default function SettingsPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkMode, setDarkMode] = useState(true); // Default to dark as per App

    // Logout Handler
    const handleLogout = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            toast.success("Çıkış yapıldı");
            navigate("/auth");
        } catch (error: any) {
            toast.error("Çıkış yapılırken hata: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Delete Account Handler
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
            "Hesabını silmek istediğine emin misin? Bu işlem geri alınamaz ve tüm stickerların silinir."
        );

        if (confirmDelete) {
            try {
                setLoading(true);
                // Using RPC or Edge Function is better, but calling delete on user is restricted.
                // Usually requires admin or specific RPC.
                // For now, we'll Try standard signOut + toast warning as placeholder if no RPC exists
                // Or assume an RPC 'delete_user_account' exists.

                // Let's assume standard signOut for now to prevent crashes, 
                // but typically you need a backend function to handle full deletion.
                const { error } = await supabase.rpc('delete_user_account');

                if (error) {
                    // Fallback if RPC doesn't exist
                    console.error("Delete account RPC failed", error);
                    toast.error("Hesap silme şu an kullanılamıyor. Lütfen destek ile iletişime geçin.");
                } else {
                    await supabase.auth.signOut();
                    toast.success("Hesabınız silindi.");
                    navigate("/auth");
                }
            } catch (error: any) {
                toast.error("İşlem başarısız: " + error.message);
            } finally {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 glass-card border-b border-border/20 backdrop-blur-lg">
                <div className="flex items-center px-4 py-4 gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="rounded-full hover:bg-muted/20"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <h1 className="text-xl font-black gradient-text">AYARLAR</h1>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-2xl mx-auto animate-in slide-in-from-bottom-4 fade-in">

                {/* App Settings */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-muted-foreground px-2">Uygulama</h2>
                    <div className="glass-card rounded-3xl overflow-hidden border border-border/30">

                        <div className="flex items-center justify-between p-4 border-b border-border/20">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-medium">Bildirimler</p>
                                    <p className="text-xs text-muted-foreground">Anlık bildirimleri al</p>
                                </div>
                            </div>
                            <Switch
                                checked={notificationsEnabled}
                                onCheckedChange={setNotificationsEnabled}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 border-b border-border/20">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                    <Moon className="w-4 h-4 text-purple-500" />
                                </div>
                                <div>
                                    <p className="font-medium">Karanlık Mod</p>
                                    <p className="text-xs text-muted-foreground">Göz yormayan tema</p>
                                </div>
                            </div>
                            <Switch
                                checked={darkMode}
                                onCheckedChange={setDarkMode}
                                disabled // Force dark mode for now as app is "dark min-h-screen"
                            />
                        </div>

                        <div className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                                    <Globe className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="font-medium">Dil / Language</p>
                                    <p className="text-xs text-muted-foreground">Uygulama dilini seç</p>
                                </div>
                            </div>
                            <LanguageSelector variant="full" />
                        </div>

                    </div>
                </div>

                {/* Support & Legal */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-muted-foreground px-2">Destek & Hakkında</h2>
                    <div className="glass-card rounded-3xl overflow-hidden border border-border/30">

                        <Link to="/legal" className="flex items-center justify-between p-4 border-b border-border/20 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Shield className="w-4 h-4 text-green-500" />
                                </div>
                                <span className="font-medium">Gizlilik Politikası</span>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                        </Link>

                        <Link to="/terms" className="flex items-center justify-between p-4 border-b border-border/20 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-orange-500" />
                                </div>
                                <span className="font-medium">Kullanım Koşulları</span>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                        </Link>

                        <a href="mailto:johnaxe.storage@gmail.com" className="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                                    <Mail className="w-4 h-4 text-pink-500" />
                                </div>
                                <div>
                                    <p className="font-medium">İletişime Geç</p>
                                    <p className="text-xs text-muted-foreground">Öneri ve şikayetler</p>
                                </div>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                        </a>

                    </div>
                </div>

                {/* Account Actions */}
                <div className="space-y-4">
                    <h2 className="text-sm font-bold text-muted-foreground px-2">Hesap</h2>
                    <div className="glass-card rounded-3xl overflow-hidden border border-border/30">

                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/10 transition-colors border-b border-border/20 text-orange-400"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="font-medium">Çıkış Yap</span>
                        </button>

                        <button
                            onClick={handleDeleteAccount}
                            disabled={loading}
                            className="w-full flex items-center gap-3 p-4 text-left hover:bg-destructive/10 transition-colors text-destructive"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="font-medium">Hesabımı Sil</span>
                        </button>

                    </div>

                    <p className="text-center text-xs text-muted-foreground pt-4">
                        Kloze Stickers v1.0.1 (Build 24)
                    </p>
                </div>

            </main>
        </div>
    );
}
