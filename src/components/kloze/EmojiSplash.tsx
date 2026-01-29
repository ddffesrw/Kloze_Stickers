import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// Emoji list for splash animation
const EMOJIS = [
  "😀", "😍", "🔥", "✨", "🎨", "🎭", "🌟", "💫", "🚀", "💖",
  "🦄", "🌈", "🎉", "🎊", "💥", "⭐", "🌸", "🎯", "💎", "🦋",
  "🍭", "🧸", "🎀", "🌺", "💜", "💙", "💚", "💛", "🧡", "❤️",
  "😎", "🤩", "🥳", "😻", "💪", "👻", "🎃", "🐱", "🐶", "🦊"
];

interface EmojiSplashProps {
  onComplete: () => void;
  duration?: number;
}

export function EmojiSplash({ onComplete, duration = 2500 }: EmojiSplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [emojis, setEmojis] = useState<Array<{
    id: number;
    emoji: string;
    x: number;
    y: number;
    scale: number;
    delay: number;
    rotate: number;
  }>>([]);

  // Generate random emoji positions - MORE emojis to fill screen
  useEffect(() => {
    const generated = [];
    const count = 80; // More emojis to fill screen

    for (let i = 0; i < count; i++) {
      // Safe zone logic: Avoid the center where text is located
      let x, y;
      let isSafe = false;
      let attempts = 0;

      while (!isSafe && attempts < 20) {
        x = Math.random() * 100;
        y = Math.random() * 100;

        // Define center center exclusion zone (approx 50% width, 30% height)
        // X: 25% - 75%
        // Y: 35% - 65%
        const inCenterX = x > 25 && x < 75;
        const inCenterY = y > 35 && y < 65;

        if (!(inCenterX && inCenterY)) {
          isSafe = true;
        }
        attempts++;
      }

      generated.push({
        id: i,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        x: x || 0, // Fallback
        y: y || 0, // Fallback
        scale: 0.5 + Math.random() * 1,
        delay: i * 25,
        rotate: Math.random() * 360,
      });
    }
    setEmojis(generated);
  }, []);

  // Auto-hide after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] bg-background flex items-center justify-center overflow-hidden transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 mesh-gradient-intense opacity-70" />

      {/* Animated Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/30 blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-secondary/30 blur-[80px] animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-accent/30 blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Floating Emojis - Fill the screen */}
      {emojis.map((item) => (
        <div
          key={item.id}
          className="absolute animate-emoji-pop"
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            transform: `rotate(${item.rotate}deg) scale(${item.scale})`,
            animationDelay: `${item.delay}ms`,
            fontSize: `${1.2 + item.scale}rem`,
          }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Center Branding */}
      <div className="relative z-10 flex flex-col items-center animate-logo-appear">
        <div className="w-20 h-20 rounded-3xl gradient-primary flex items-center justify-center glow-violet shadow-2xl mb-4 animate-bounce-slow">
          <span className="text-4xl">🎨</span>
        </div>
        <h1 className="text-4xl font-black gradient-text tracking-tight">KLOZE</h1>
        <p className="text-xl font-bold text-primary mt-1 tracking-widest">STİCKERS</p>
        <p className="text-xs text-muted-foreground mt-2 opacity-60">Powered by AI ✨</p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes emoji-pop {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes logo-appear {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        .animate-emoji-pop {
          animation: emoji-pop 0.4s ease-out forwards;
          opacity: 0;
        }

        .animate-logo-appear {
          animation: logo-appear 0.8s ease-out 0.3s forwards;
          opacity: 0;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
