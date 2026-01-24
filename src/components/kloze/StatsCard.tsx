import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  variant?: "default" | "primary" | "secondary";
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  variant = "default" 
}: StatsCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02]",
      variant === "primary" && "border-primary/30 glow-purple",
      variant === "secondary" && "border-secondary/30 glow-green"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{title}</p>
          <p className={cn(
            "text-3xl font-bold mt-2",
            variant === "primary" && "text-primary",
            variant === "secondary" && "text-secondary",
            variant === "default" && "text-foreground"
          )}>
            {typeof value === "number" ? value.toLocaleString("tr-TR") : value}
          </p>
          {trend && (
            <p className={cn(
              "text-xs mt-2 font-medium",
              trendUp ? "text-secondary" : "text-destructive"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div className={cn(
          "p-3 rounded-xl",
          variant === "primary" && "bg-primary/20 text-primary",
          variant === "secondary" && "bg-secondary/20 text-secondary",
          variant === "default" && "bg-muted text-muted-foreground"
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
