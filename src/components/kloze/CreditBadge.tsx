import { useState, memo } from "react";
import { Coins, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreditModal } from "./CreditModal";

interface CreditBadgeProps {
  credits: number;
  isPro?: boolean;
  className?: string;
}

function CreditBadgeComponent({ credits, isPro = false, className }: CreditBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          "bg-gradient-to-r from-amber-500/20 to-yellow-500/20",
          "border border-amber-500/30",
          "hover:from-amber-500/30 hover:to-yellow-500/30",
          "transition-all duration-300 hover:scale-105",
          "group",
          className
        )}
      >
        {isPro ? (
          <>
            <Sparkles className="w-4 h-4 text-amber-400 group-hover:animate-pulse" />
            <span className="text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
              PRO
            </span>
            <span className="text-[10px] font-semibold text-amber-400/70">
              {credits}
            </span>
          </>
        ) : (
          <>
            <Coins className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="text-xs font-bold text-amber-300">
              {credits}
            </span>
          </>
        )}
      </button>

      <CreditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        currentCredits={credits}
        isPro={isPro}
      />
    </>
  );
}

export const CreditBadge = memo(CreditBadgeComponent);
