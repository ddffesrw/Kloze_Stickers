import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, Download, Users, ChevronRight, ChevronLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingModalProps {
  onComplete: () => void;
}

const slides = [
  {
    id: 1,
    icon: "🎨",
    title: "KLOZE'a Hoşgeldin!",
    description: "AI destekli sticker üretici ile hayal gücünü serbest bırak",
    color: "from-violet-500 to-purple-600",
    features: ["Sınırsız yaratıcılık", "Kolay kullanım", "Anında sonuç"]
  },
  {
    id: 2,
    icon: "✨",
    IconComponent: Wand2,
    title: "AI ile Üret",
    description: "Sadece hayal et ve yaz, AI senin için sticker'ı oluştursun",
    color: "from-cyan-500 to-blue-600",
    features: ["3 farklı AI modeli", "Arka plan silme", "Yüksek kalite"]
  },
  {
    id: 3,
    icon: "📦",
    IconComponent: Download,
    title: "Paketler Oluştur",
    description: "Sticker'larını paketleyip WhatsApp'a ekle veya paylaş",
    color: "from-emerald-500 to-green-600",
    features: ["WhatsApp entegrasyonu", "Kolay paylaşım", "Özel koleksiyonlar"]
  },
  {
    id: 4,
    icon: "🌟",
    IconComponent: Users,
    title: "Topluluğa Katıl",
    description: "Diğer kullanıcıların paketlerini keşfet ve ilham al",
    color: "from-amber-500 to-orange-600",
    features: ["Trend paketler", "Beğeni & takip", "Günlük bonuslar"]
  }
];

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('kloze_onboarding_complete', 'true');
    onComplete();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const slide = slides[currentSlide];

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-20 transition-all duration-500",
        slide.color
      )} />

      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground hover:text-foreground"
        >
          Atla
          <X className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center max-w-sm"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={cn(
                "w-28 h-28 rounded-3xl bg-gradient-to-br flex items-center justify-center mb-8 shadow-2xl",
                slide.color
              )}
            >
              <span className="text-5xl">{slide.icon}</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black text-foreground mb-3"
            >
              {slide.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground text-lg mb-8"
            >
              {slide.description}
            </motion.p>

            {/* Features */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              {slide.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-left"
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center",
                    slide.color
                  )}>
                    <Sparkles className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="p-6 pb-10 space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentSlide ? 1 : -1);
                setCurrentSlide(i);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === currentSlide
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 relative z-50">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={prevSlide}
              className="flex-1 h-14 rounded-2xl border-border/50"
              type="button"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Geri
            </Button>
          )}
          <Button
            onClick={() => {
              console.log('[Onboarding] Button clicked, currentSlide:', currentSlide);
              nextSlide();
            }}
            type="button"
            className={cn(
              "h-14 rounded-2xl font-bold text-lg transition-all cursor-pointer select-none",
              currentSlide === 0 ? "flex-1" : "flex-[2]",
              "bg-gradient-to-r text-white",
              slide.color
            )}
          >
            {currentSlide === slides.length - 1 ? (
              <>
                Başla!
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                Devam
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if onboarding should be shown
 */
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('kloze_onboarding_complete');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, completeOnboarding };
}
