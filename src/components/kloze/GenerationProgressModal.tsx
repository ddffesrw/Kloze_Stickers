import { useState, useEffect } from "react";
import { Sparkles, Wand2, Loader2, CheckCircle, Heart, Star, Zap } from "lucide-react";
import {
    AlertDialog,
    AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface GenerationProgressModalProps {
    isOpen: boolean;
    progress: number;
    message: string;
    isComplete?: boolean;
    onComplete?: () => void;
}

// Fun emoji list for animation
const FUN_EMOJIS = ["✨", "🎨", "🌟", "💫", "🔮", "🎭", "🦄", "🌈", "💖", "⭐", "🚀", "🎉"];

// Encouraging messages
const ENCOURAGING_MESSAGES = [
    "Sihir yapılıyor... ✨",
    "Hayal gücün şekilleniyor 🎨",
    "Neredeyse hazır! 🚀",
    "AI çalışıyor... 🤖",
    "Süper bir şey geliyor! 🌟",
    "Biraz sabır, harika olacak! 💫",
];

export function GenerationProgressModal({
    isOpen,
    progress,
    message,
    isComplete = false,
    onComplete,
}: GenerationProgressModalProps) {
    const [currentEmoji, setCurrentEmoji] = useState("✨");
    const [floatingEmojis, setFloatingEmojis] = useState<Array<{
        id: number;
        emoji: string;
        x: number;
        delay: number;
    }>>([]);
    const [encouragingMessage, setEncouragingMessage] = useState(ENCOURAGING_MESSAGES[0]);

    // Rotate main emoji
    useEffect(() => {
        if (!isOpen || isComplete) return;

        const interval = setInterval(() => {
            setCurrentEmoji(FUN_EMOJIS[Math.floor(Math.random() * FUN_EMOJIS.length)]);
        }, 500);

        return () => clearInterval(interval);
    }, [isOpen, isComplete]);

    // Generate floating emojis
    useEffect(() => {
        if (!isOpen || isComplete) return;

        const generated = [];
        for (let i = 0; i < 12; i++) {
            generated.push({
                id: i,
                emoji: FUN_EMOJIS[Math.floor(Math.random() * FUN_EMOJIS.length)],
                x: 10 + Math.random() * 80,
                delay: i * 200,
            });
        }
        setFloatingEmojis(generated);
    }, [isOpen, isComplete]);

    // Rotate encouraging messages
    useEffect(() => {
        if (!isOpen || isComplete) return;

        const interval = setInterval(() => {
            setEncouragingMessage(ENCOURAGING_MESSAGES[Math.floor(Math.random() * ENCOURAGING_MESSAGES.length)]);
        }, 2000);

        return () => clearInterval(interval);
    }, [isOpen, isComplete]);

    // Auto close on complete
    useEffect(() => {
        if (isComplete && onComplete) {
            const timer = setTimeout(onComplete, 1500);
            return () => clearTimeout(timer);
        }
    }, [isComplete, onComplete]);

    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="glass-card gradient-dark border-white/10 max-w-sm overflow-hidden">
                {/* Floating Emojis Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {!isComplete && floatingEmojis.map((item) => (
                        <div
                            key={item.id}
                            className="absolute animate-float-up text-2xl opacity-60"
                            style={{
                                left: `${item.x}%`,
                                animationDelay: `${item.delay}ms`,
                                animationDuration: '3s',
                            }}
                        >
                            {item.emoji}
                        </div>
                    ))}
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-secondary/30 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />

                <div className="relative z-10 text-center py-6">
                    {/* Main Icon */}
                    <div className="relative mx-auto w-24 h-24 mb-6">
                        {isComplete ? (
                            <div className="w-full h-full rounded-3xl bg-green-500/20 flex items-center justify-center animate-bounce-in">
                                <CheckCircle className="w-12 h-12 text-green-500" />
                            </div>
                        ) : (
                            <div className="w-full h-full rounded-3xl gradient-primary flex items-center justify-center glow-violet animate-pulse-glow">
                                <span className="text-5xl animate-wiggle">{currentEmoji}</span>
                            </div>
                        )}

                        {/* Orbiting Icons */}
                        {!isComplete && (
                            <>
                                <div className="absolute -top-2 -right-2 animate-orbit">
                                    <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
                                </div>
                                <div className="absolute -bottom-2 -left-2 animate-orbit-reverse">
                                    <Heart className="w-5 h-5 text-pink-400 fill-pink-400" />
                                </div>
                                <div className="absolute top-1/2 -right-4 animate-orbit" style={{ animationDelay: '0.5s' }}>
                                    <Zap className="w-5 h-5 text-secondary" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-black text-white mb-2">
                        {isComplete ? "Tamamlandı! 🎉" : "Sihir Yapılıyor..."}
                    </h3>

                    {/* Encouraging Message */}
                    <p className="text-sm text-white/60 mb-6 h-5 transition-all duration-300">
                        {isComplete ? "Sticker'ın hazır!" : encouragingMessage}
                    </p>

                    {/* Progress Section */}
                    {!isComplete && (
                        <div className="space-y-3">
                            {/* Progress Bar */}
                            <div className="relative">
                                <Progress value={progress} className="h-3 bg-white/10" />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 transition-all duration-300"
                                    style={{ left: `${Math.min(progress, 95)}%` }}
                                >
                                    <span className="text-sm">🎨</span>
                                </div>
                            </div>

                            {/* Progress Text */}
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-white/50 flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {message}
                                </span>
                                <span className="text-primary font-bold">{progress}%</span>
                            </div>

                            {/* Cancel Button */}
                            <button
                                onClick={onComplete} // Using onComplete to close for now, ideally should create separate onCancel prop
                                className="mt-4 w-full py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-white/40 transition-colors"
                            >
                                İptal Et
                            </button>
                        </div>
                    )}

                    {/* Fun Facts */}
                    {!isComplete && progress > 30 && progress < 90 && (
                        <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-[11px] text-white/40">
                                💡 Biliyormuydun? AI her seferinde benzersiz bir sticker üretir!
                            </p>
                        </div>
                    )}
                </div>

                {/* CSS Animations */}
                <style>{`
          @keyframes float-up {
            0% {
              transform: translateY(100%) scale(0);
              opacity: 0;
            }
            20% {
              opacity: 0.6;
            }
            80% {
              opacity: 0.6;
            }
            100% {
              transform: translateY(-100px) scale(1);
              opacity: 0;
            }
          }

          @keyframes wiggle {
            0%, 100% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
          }

          @keyframes orbit {
            0% { transform: rotate(0deg) translateX(10px) rotate(0deg); }
            100% { transform: rotate(360deg) translateX(10px) rotate(-360deg); }
          }

          @keyframes orbit-reverse {
            0% { transform: rotate(0deg) translateX(8px) rotate(0deg); }
            100% { transform: rotate(-360deg) translateX(8px) rotate(360deg); }
          }

          @keyframes bounce-in {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }

          .animate-float-up {
            animation: float-up 3s ease-out infinite;
          }

          .animate-wiggle {
            animation: wiggle 0.5s ease-in-out infinite;
          }

          .animate-orbit {
            animation: orbit 3s linear infinite;
          }

          .animate-orbit-reverse {
            animation: orbit-reverse 4s linear infinite;
          }

          .animate-bounce-in {
            animation: bounce-in 0.5s ease-out forwards;
          }
        `}</style>
            </AlertDialogContent>
        </AlertDialog>
    );
}
