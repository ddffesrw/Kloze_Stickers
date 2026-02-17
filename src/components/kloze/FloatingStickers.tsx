interface FloatingStickersProps {
  className?: string;
  reduced?: boolean; // Reduced mode for low-end devices
}

const floatingStickers = [
  { emoji: "😂", delay: 0, position: "top-20 left-8", size: "w-12 h-12" },
  { emoji: "🔥", delay: 1, position: "top-32 right-12", size: "w-10 h-10" },
  { emoji: "💜", delay: 2, position: "top-48 left-16", size: "w-8 h-8" },
  { emoji: "✨", delay: 0.5, position: "top-24 right-24", size: "w-9 h-9" },
  { emoji: "🎨", delay: 1.5, position: "top-56 right-8", size: "w-11 h-11" },
  { emoji: "⚡", delay: 2.5, position: "top-40 left-4", size: "w-8 h-8" },
];

// Reduced set for low-end devices (only 3 stickers, no blur orbs)
const reducedStickers = [
  { emoji: "😂", delay: 0, position: "top-20 left-8", size: "w-10 h-10" },
  { emoji: "🔥", delay: 1, position: "top-32 right-12", size: "w-9 h-9" },
  { emoji: "💜", delay: 2, position: "top-48 left-16", size: "w-8 h-8" },
];

export function FloatingStickers({ className, reduced = false }: FloatingStickersProps) {
  const stickersToRender = reduced ? reducedStickers : floatingStickers;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {stickersToRender.map((sticker, index) => (
        <div
          key={index}
          className={`absolute ${sticker.position} ${sticker.size} ${reduced ? 'opacity-40' : 'animate-float opacity-60'}`}
          style={reduced ? undefined : {
            animationDelay: `${sticker.delay}s`,
            animationDuration: `${4 + index * 0.5}s`
          }}
        >
          <span className={`text-4xl ${reduced ? '' : 'filter drop-shadow-lg'}`}>{sticker.emoji}</span>
        </div>
      ))}

      {/* Glow Orbs - Only on high-end devices */}
      {!reduced && (
        <>
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-primary/20 blur-[100px] animate-pulse-glow" />
          <div className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-secondary/20 blur-[80px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/4 left-1/3 w-56 h-56 rounded-full bg-accent/15 blur-[90px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        </>
      )}
    </div>
  );
}
