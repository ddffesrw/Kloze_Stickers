import { Home, Sparkles, Compass, User, Shield } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { auth } from "@/lib/supabase";
import { isAdminAvailable, isAndroid, isIOS } from "@/lib/platform";

const navItems = [
  { path: "/", icon: Home, label: "Ana Sayfa" },
  { path: "/generate", icon: Sparkles, label: "Üret" },
  { path: "/search", icon: Compass, label: "Keşfet" },
  { path: "/profile", icon: User, label: "Profil" },
];

export function BottomNav() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    auth.getCurrentUser().then(user => {
      if (user) {
        setIsLoggedIn(true);
        if (user.email === "johnaxe.storage@gmail.com") {
          setIsAdmin(true);
        }
      } else {
        setIsLoggedIn(false);
        setIsAdmin(false);
      }
    });
  }, []);

  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  // Android: bottom nav çubuğu sistem tuşlarıyla (home, back, recent) çakışıyor.
  // Capacitor WebView Android'de safe-area-inset-bottom genellikle 0 döner.
  // Gesture nav: ~20px, 3-button nav: ~48px alt boşluk gerekir.
  // Extra padding ile çakışmayı önlüyoruz.
  const getBottomStyle = (): string => {
    if (isAndroid()) return '28px';    // Android: gesture + 3-button nav için güvenli
    if (isIOS()) return 'calc(env(safe-area-inset-bottom, 8px) + 8px)';  // iOS: safe area kullan
    return '16px'; // Web
  };

  return (
    <nav
      className="fixed left-4 right-4 z-50"
      style={{ bottom: getBottomStyle() }}
    >
      <div className="glass-card rounded-3xl border border-border/40 overflow-hidden">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const isProfile = item.path === "/profile";
            // Guest users: redirect profile to auth
            const path = isProfile && !isLoggedIn ? "/auth" : item.path;
            const label = isProfile && !isLoggedIn ? "Giriş Yap" : item.label;
            const isActive = location.pathname === path;
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={path}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-300",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
                )}
                <div className="relative">
                  <Icon
                    className={cn(
                      "relative z-10 w-5 h-5 transition-all duration-300",
                      isActive && "text-glow-violet scale-110"
                    )}
                  />
                  {/* Admin Badge */}
                  {isProfile && isAdmin && (
                    <div className="absolute -top-1 -right-2 w-3 h-3 rounded-full bg-red-600 border border-red-500 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                  )}
                </div>
                <span className={cn(
                  "relative z-10 text-[10px] font-medium",
                  isActive && "text-primary"
                )}>
                  {label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary glow-violet" />
                )}
              </Link>
            );
          })}

          {/* Admin Button - Only visible on Web */}
          {isAdmin && isAdminAvailable() && (
            <Link
              to="/admin"
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-5 py-2 rounded-2xl transition-all duration-300",
                location.pathname === "/admin"
                  ? "text-red-500"
                  : "text-red-500/70 hover:text-red-500"
              )}
            >
              <div className="absolute inset-0 bg-red-500/10 rounded-2xl border border-red-500/30" />
              <Shield
                className="relative z-10 w-5 h-5 transition-all duration-300 drop-shadow-[0_0_6px_rgba(220,38,38,0.8)]"
              />
              <span className="relative z-10 text-[10px] font-bold">
                Admin
              </span>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.9)]" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
