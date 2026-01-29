import { cn } from "@/lib/utils";
import { Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface AdBannerProps {
    className?: string;
    variant?: "horizontal" | "square" | "native";
    isPro?: boolean;
}

export function AdBanner({ className, variant = "horizontal", isPro = false }: AdBannerProps) {
    // Hide ad if user is Pro
    if (isPro) return null;

    return (
        <div className={cn(
            "relative overflow-hidden rounded-2xl",
            variant === "horizontal" ? "w-full" : "w-full aspect-square",
            className
        )}>
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/50 via-secondary/50 to-accent/50 rounded-2xl opacity-50" />

            {/* Inner Content */}
            <div className={cn(
                "relative m-[1px] rounded-2xl bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center text-center overflow-hidden",
                variant === "horizontal" ? "p-4" : "p-6"
            )}>
                {/* Animated Shine Effect */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -inset-[100%] animate-[spin_8s_linear_infinite] bg-gradient-conic from-transparent via-white/5 to-transparent" />
                </div>

                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <p className="text-xs font-bold text-foreground">Reklamsız Deneyim</p>
                        <p className="text-[10px] text-muted-foreground">Pro'ya geçerek reklamları kaldır</p>
                    </div>
                    <Link
                        to="/profile"
                        className="ml-auto px-3 py-1.5 rounded-lg bg-gradient-to-r from-primary to-secondary text-[10px] font-bold text-white flex items-center gap-1 hover:opacity-90 transition-opacity"
                    >
                        <Crown className="w-3 h-3" />
                        PRO
                    </Link>
                </div>
            </div>
        </div>
    );
}

