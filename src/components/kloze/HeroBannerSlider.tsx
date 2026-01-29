import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Wand2, Share2, Palette, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
    id: number;
    emoji: string;
    title: string;
    subtitle: string;
    accent: string;
    link?: string;
}

const slides: Slide[] = [
    {
        id: 1,
        emoji: "✨",
        title: "AI ile Sticker Üret",
        subtitle: "Hayal et, yaz, saniyeler içinde hazır",
        accent: "from-violet-500/20 to-fuchsia-500/20",
        link: "/generate"
    },
    {
        id: 2,
        emoji: "📲",
        title: "Anında Paylaş",
        subtitle: "WhatsApp ve Telegram'da kullan",
        accent: "from-emerald-500/20 to-teal-500/20",
    },
    {
        id: 3,
        emoji: "🎭",
        title: "Arka Plan Silme",
        subtitle: "Profesyonel kalite, tek tıkla",
        accent: "from-amber-500/20 to-orange-500/20",
        link: "/gallery-upload"
    },
    {
        id: 4,
        emoji: "👑",
        title: "Pro Ayrıcalıkları",
        subtitle: "Sınırsız üretim, reklamsız deneyim",
        accent: "from-yellow-500/20 to-amber-500/20",
        link: "/credits"
    }
];

export function HeroBannerSlider() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const goToSlide = useCallback((index: number) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentIndex(index);
        setTimeout(() => setIsAnimating(false), 500);
    }, [isAnimating]);

    // Auto-advance
    useEffect(() => {
        const timer = setInterval(() => {
            goToSlide((currentIndex + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [currentIndex, goToSlide]);

    const slide = slides[currentIndex];

    const content = (
        <div className="flex items-center gap-4">
            {/* Emoji Icon */}
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl">
                {slide.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white/90 leading-tight">
                    {slide.title}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                    {slide.subtitle}
                </p>
            </div>

            {/* Arrow */}
            {slide.link && (
                <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
            )}
        </div>
    );

    return (
        <div className="relative">
            {/* Banner */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-2xl p-4 transition-all duration-500 ease-out",
                    "bg-gradient-to-r border border-white/5",
                    slide.accent
                )}
            >
                {/* Subtle glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent" />

                {/* Content with fade transition */}
                <div
                    key={slide.id}
                    className="relative z-10 animate-fade-in"
                >
                    {slide.link ? (
                        <Link to={slide.link} className="block">
                            {content}
                        </Link>
                    ) : (
                        content
                    )}
                </div>
            </div>

            {/* Minimal Dots */}
            <div className="flex justify-center gap-1.5 mt-3">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => goToSlide(idx)}
                        className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                            idx === currentIndex
                                ? "bg-white/60 w-4"
                                : "bg-white/20 hover:bg-white/30"
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
