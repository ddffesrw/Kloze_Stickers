import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Wand2, Share2, Palette, Crown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";
import { useTranslation } from "react-i18next";

interface Slide {
    id: number;
    emoji: string;
    titleKey: string;
    subtitleKey: string;
    accent: string;
    link?: string;
}

const slidesData: Slide[] = [
    {
        id: 1,
        emoji: "🎨",
        titleKey: "home.heroBanner.aiGeneration.title",
        subtitleKey: "home.heroBanner.aiGeneration.subtitle",
        accent: "from-violet-500/30 to-purple-600/30",
        link: "/generate"
    },
    {
        id: 2,
        emoji: "⚡",
        titleKey: "home.heroBanner.whatsapp.title",
        subtitleKey: "home.heroBanner.whatsapp.subtitle",
        accent: "from-emerald-500/30 to-green-600/30",
    },
    {
        id: 3,
        emoji: "✂️",
        titleKey: "home.heroBanner.bgRemoval.title",
        subtitleKey: "home.heroBanner.bgRemoval.subtitle",
        accent: "from-cyan-500/30 to-blue-600/30",
        link: "/gallery-upload"
    },
    {
        id: 4,
        emoji: "👑",
        titleKey: "home.heroBanner.premium.title",
        subtitleKey: "home.heroBanner.premium.subtitle",
        accent: "from-amber-500/30 to-orange-600/30",
        link: "/credits"
    },
    {
        id: 5,
        emoji: "🔥",
        titleKey: "home.heroBanner.library.title",
        subtitleKey: "home.heroBanner.library.subtitle",
        accent: "from-pink-500/30 to-rose-600/30",
    }
];

export function HeroBannerSlider() {
    const { t } = useTranslation();
    const { shouldReduceAnimations, shouldReduceEffects } = useDevicePerformance();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const goToSlide = useCallback((index: number) => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrentIndex(index);
        setTimeout(() => setIsAnimating(false), 500);
    }, [isAnimating]);

    // Auto-advance - Disable on low-end devices to save CPU
    useEffect(() => {
        if (shouldReduceAnimations) return; // Don't auto-advance on low-end devices

        const timer = setInterval(() => {
            goToSlide((currentIndex + 1) % slidesData.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [currentIndex, goToSlide, shouldReduceAnimations]);

    const slide = slidesData[currentIndex];

    const content = (
        <div className="flex items-center gap-5">
            {/* Emoji Icon - Bigger */}
            <div className="flex-shrink-0 w-20 h-20 rounded-3xl bg-foreground/10 backdrop-blur-sm border border-foreground/20 flex items-center justify-center text-4xl shadow-lg">
                {slide.emoji}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-foreground leading-tight mb-1.5">
                    {t(slide.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    {t(slide.subtitleKey)}
                </p>
            </div>

            {/* Arrow */}
            {slide.link && (
                <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 group-hover:translate-x-1 transition-transform" />
            )}
        </div>
    );

    return (
        <div className="relative">
            {/* Banner - Bigger & More Professional */}
            <div
                className={cn(
                    "relative overflow-hidden rounded-3xl p-6 transition-all duration-500 ease-out",
                    "bg-gradient-to-br border border-border/50 shadow-2xl",
                    "hover:scale-[1.01] active:scale-[0.99]",
                    slide.accent
                )}
            >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 via-transparent to-foreground/10" />

                {/* Glow effect - Only on high-end devices */}
                {!shouldReduceEffects && (
                    <>
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-foreground/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-foreground/5 rounded-full blur-3xl" />
                    </>
                )}

                {/* Content with fade transition */}
                <div
                    key={slide.id}
                    className="relative z-10 animate-fade-in"
                >
                    {slide.link ? (
                        <Link to={slide.link} className="block group">
                            {content}
                        </Link>
                    ) : (
                        <div className="group">
                            {content}
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Dots - More Professional */}
            <div className="flex justify-center gap-2 mt-4">
                {slidesData.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => goToSlide(idx)}
                        className={cn(
                            "h-1.5 rounded-full transition-all duration-300",
                            idx === currentIndex
                                ? "bg-foreground/80 w-8 shadow-sm"
                                : "bg-foreground/25 w-1.5 hover:bg-foreground/40 hover:w-3"
                        )}
                        aria-label={`Go to slide ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
