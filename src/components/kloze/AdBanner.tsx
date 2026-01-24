import { currentUser } from "@/data/mockData";
import { cn } from "@/lib/utils";

interface AdBannerProps {
    className?: string;
    variant?: "horizontal" | "square";
}

export function AdBanner({ className, variant = "horizontal" }: AdBannerProps) {
    // Real implementation should check useAuth or Supabase user data
    // For now using mock user as per existing pattern
    if (currentUser.isPro) return null;

    return (
        <div className={cn(
            "relative overflow-hidden bg-muted/20 border border-dashed border-border/50 flex flex-col items-center justify-center text-center p-4",
            variant === "horizontal" ? "w-full h-24 rounded-2xl" : "w-full aspect-square rounded-3xl",
            className
        )}>
            <div className="absolute inset-0 bg-grid-white/5 opacity-50" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider relative z-10">
                Reklam Alanı
            </span>
            <p className="text-[10px] text-muted-foreground/60 relative z-10 mt-1">
                Pro'ya geçerek reklamları gizle
            </p>
        </div>
    );
}
