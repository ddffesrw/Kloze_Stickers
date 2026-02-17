import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'icon' | 'full';
}

const languages = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export function LanguageSelector({ className, variant = 'full' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const currentIndex = languages.findIndex(lang => lang.code === i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    i18n.changeLanguage(languages[nextIndex].code);
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleLanguage}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl",
          "bg-card border border-border/50",
          "hover:bg-muted/50 transition-colors",
          className
        )}
        title={`Switch to ${languages.find(l => l.code !== i18n.language)?.name}`}
      >
        <Globe className="w-4 h-4 text-foreground/80" />
        <span className="text-sm font-medium">{currentLanguage.flag}</span>
      </button>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
            "border border-border/50",
            i18n.language === lang.code
              ? "bg-primary text-primary-foreground shadow-md"
              : "bg-card text-foreground hover:bg-muted/50"
          )}
        >
          <span className="text-lg">{lang.flag}</span>
          <span className="text-sm font-medium">{lang.name}</span>
        </button>
      ))}
    </div>
  );
}
