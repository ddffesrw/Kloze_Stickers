import { memo } from "react";
import { cn } from "@/lib/utils";

interface CategoryPillProps {
  emoji: string;
  name: string;
  isActive?: boolean;
  onClick?: () => void;
  color?: "violet" | "cyan" | "pink" | "default";
}

const colorVariants = {
  violet: {
    active: "bg-primary/20 border-primary/50 text-primary glow-violet",
    inactive: "hover:border-primary/30 hover:bg-primary/5",
  },
  cyan: {
    active: "bg-secondary/20 border-secondary/50 text-secondary glow-cyan",
    inactive: "hover:border-secondary/30 hover:bg-secondary/5",
  },
  pink: {
    active: "bg-accent/20 border-accent/50 text-accent glow-pink",
    inactive: "hover:border-accent/30 hover:bg-accent/5",
  },
  default: {
    active: "bg-primary/20 border-primary/50 text-primary glow-violet",
    inactive: "hover:border-border/50 hover:bg-muted/50",
  },
};

function CategoryPillComponent({
  emoji,
  name,
  isActive,
  onClick,
  color = "default"
}: CategoryPillProps) {
  const variant = colorVariants[color];

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap  duration-300",
        "border text-sm font-medium",
        "backdrop-blur-sm",
        isActive
          ? variant.active
          : cn("bg-muted/20 text-muted-foreground border-border/30", variant.inactive)
      )}
    >
      <span className={cn(
        "text-base transition-transform duration-300",
        isActive && "scale-110"
      )}>
        {emoji}
      </span>
      <span>{name}</span>
    </button>
  );
}

export const CategoryPill = memo(CategoryPillComponent);
