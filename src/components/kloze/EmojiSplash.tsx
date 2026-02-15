import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EmojiSplashProps {
  onComplete: () => void;
  duration?: number;
}

export function EmojiSplash({ onComplete, duration = 2800 }: EmojiSplashProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [phase, setPhase] = useState<'logo' | 'reveal' | 'exit'>('logo');

  useEffect(() => {
    // Phase 1: Logo appears (0-800ms)
    const revealTimer = setTimeout(() => setPhase('reveal'), 800);
    // Phase 2: Full reveal (800-2300ms)
    const exitTimer = setTimeout(() => setPhase('exit'), duration - 500);
    // Phase 3: Fade out
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 400);
    }, duration);

    return () => {
      clearTimeout(revealTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-400",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      style={{ background: 'linear-gradient(135deg, #0a0a12 0%, #12081f 40%, #0a0f1a 100%)' }}
    >
      {/* Subtle gradient glow behind logo */}
      <div
        className={cn(
          "absolute w-[300px] h-[300px] rounded-full transition-all duration-1000",
          phase === 'logo' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
        )}
        style={{
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, rgba(139,92,246,0.05) 50%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Secondary accent glow */}
      <div
        className={cn(
          "absolute w-[200px] h-[200px] rounded-full transition-all duration-1200 delay-300",
          phase === 'logo' ? 'opacity-0 scale-50' : 'opacity-60 scale-100'
        )}
        style={{
          background: 'radial-gradient(circle, rgba(6,182,212,0.2) 0%, transparent 60%)',
          filter: 'blur(50px)',
          transform: 'translate(60px, 40px)',
        }}
      />

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center">
        {/* App icon */}
        <div
          className={cn(
            "relative transition-all duration-700 ease-out",
            phase === 'logo' ? 'scale-0 rotate-[-180deg]' : 'scale-100 rotate-0'
          )}
        >
          {/* Outer ring */}
          <div className="w-24 h-24 rounded-[28px] p-[2px] splash-ring-gradient">
            <div className="w-full h-full rounded-[26px] bg-[#12081f] flex items-center justify-center relative overflow-hidden">
              {/* Inner gradient fill */}
              <div
                className="absolute inset-0 opacity-80"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(6,182,212,0.2) 100%)',
                }}
              />
              {/* Icon */}
              <span className="text-[42px] relative z-10 drop-shadow-lg">🎨</span>
            </div>
          </div>

          {/* Sparkle accents */}
          <div
            className={cn(
              "absolute -top-2 -right-2 transition-all duration-500 delay-500",
              phase !== 'logo' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            )}
          >
            <span className="text-lg">✨</span>
          </div>
          <div
            className={cn(
              "absolute -bottom-1 -left-2 transition-all duration-500 delay-700",
              phase !== 'logo' ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
            )}
          >
            <span className="text-sm">💜</span>
          </div>
        </div>

        {/* Brand name */}
        <div
          className={cn(
            "mt-6 transition-all duration-600 ease-out",
            phase === 'logo' ? 'opacity-0 translate-y-4' : '',
            phase === 'reveal' ? 'opacity-100 translate-y-0' : '',
            phase === 'exit' ? 'opacity-100 translate-y-0' : ''
          )}
          style={{ transitionDelay: '200ms' }}
        >
          <h1 className="text-[36px] font-black tracking-tight text-center leading-none"
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #e0d4ff 50%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            KLOZE
          </h1>
        </div>

        {/* Subtitle */}
        <div
          className={cn(
            "transition-all duration-500 ease-out",
            phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          )}
          style={{ transitionDelay: '400ms' }}
        >
          <p className="text-[13px] font-semibold tracking-[0.3em] text-violet-300/70 mt-1">
            STICKER STUDIO
          </p>
        </div>

        {/* Tagline */}
        <div
          className={cn(
            "mt-5 transition-all duration-500 ease-out",
            phase === 'reveal' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          )}
          style={{ transitionDelay: '600ms' }}
        >
          <p className="text-[11px] text-white/30 font-medium tracking-wider">
            AI ile Sticker Oluştur
          </p>
        </div>

        {/* Loading indicator */}
        <div
          className={cn(
            "mt-8 transition-all duration-500",
            phase === 'reveal' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ transitionDelay: '800ms' }}
        >
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60 splash-dot" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60 splash-dot" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400/60 splash-dot" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Bottom branding */}
      <div
        className={cn(
          "absolute bottom-12 transition-all duration-500",
          phase === 'reveal' ? 'opacity-100' : 'opacity-0'
        )}
        style={{ transitionDelay: '900ms' }}
      >
        <p className="text-[10px] text-white/15 font-medium tracking-wider">
          Powered by AI
        </p>
      </div>

      <style>{`
        .splash-ring-gradient {
          background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #8b5cf6 100%);
          background-size: 200% 200%;
          animation: splash-ring-shift 2s ease-in-out infinite;
        }

        @keyframes splash-ring-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .splash-dot {
          animation: splash-dot-pulse 1s ease-in-out infinite;
        }

        @keyframes splash-dot-pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
