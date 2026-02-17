import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "relative w-14 h-7 rounded-full transition-all duration-300 ease-in-out",
        "border border-border/30 shadow-sm",
        "hover:scale-105 active:scale-95",
        theme === 'dark'
          ? "bg-gradient-to-r from-slate-800 to-slate-900"
          : "bg-gradient-to-r from-sky-100 to-blue-200"
      )}
      aria-label="Toggle theme"
    >
      {/* Track highlight */}
      <div className={cn(
        "absolute inset-0 rounded-full opacity-50 blur-sm transition-opacity",
        theme === 'dark'
          ? "bg-purple-500/20"
          : "bg-yellow-400/30"
      )} />

      {/* Sliding circle */}
      <div className={cn(
        "absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 ease-in-out",
        "flex items-center justify-center",
        "shadow-md",
        theme === 'dark'
          ? "left-0.5 bg-gradient-to-br from-purple-500 to-indigo-600"
          : "left-7 bg-gradient-to-br from-yellow-300 to-orange-400"
      )}>
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-white" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Background icons */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 pointer-events-none">
        <Sun className={cn(
          "w-3 h-3 transition-opacity duration-300",
          theme === 'light' ? "opacity-0" : "opacity-40 text-yellow-200"
        )} />
        <Moon className={cn(
          "w-3 h-3 transition-opacity duration-300",
          theme === 'dark' ? "opacity-0" : "opacity-40 text-indigo-400"
        )} />
      </div>
    </button>
  );
}
