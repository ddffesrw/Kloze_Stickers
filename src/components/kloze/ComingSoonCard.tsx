import { Rocket } from "lucide-react";

export function ComingSoonCard() {
    return (
        <div className="block group">
            <div className="relative rounded-2xl">
                {/* 3D Shadow Layers (same as PackCard) */}
                <div className="absolute inset-0 rounded-2xl bg-black/40 translate-y-2 translate-x-0.5 blur-sm" />
                <div className="absolute inset-0 rounded-2xl bg-black/20 translate-y-1" />

                {/* Card Content */}
                <div className="relative overflow-hidden rounded-2xl bg-card border border-dashed border-primary/30 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    {/* Top Highlight */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Cover Area - aspect-square like PackCard */}
                    <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
                        {/* Animated sparkles */}
                        <div className="absolute top-3 left-4 text-primary/50 animate-ping" style={{ animationDuration: '3s' }}>✨</div>
                        <div className="absolute bottom-6 right-5 text-secondary/50 animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }}>💫</div>

                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
                            <Rocket className="w-5 h-5 text-primary" />
                        </div>

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                    </div>

                    {/* Info Section (same as PackCard) */}
                    <div className="p-2 -mt-3 relative">
                        <h3 className="font-bold text-foreground text-xs truncate">Çok Yakında!</h3>
                        <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">Yeni paketler yolda</span>
                            <div className="flex items-center gap-0.5">
                                <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-1 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '100ms' }} />
                                <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: '200ms' }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
