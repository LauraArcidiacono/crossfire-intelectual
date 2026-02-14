import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/game-store';

interface LanguageSelectorProps {
  className?: string;
}

export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useGameStore();

  const toggle = () => {
    const newLang = language === 'es' ? 'en' : 'es';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggle}
      className={`
        flex items-center gap-1.5 px-3.5 py-1.5 rounded-full
        glass-strong shadow-sm
        text-sm font-title font-bold text-warm-brown
        hover:shadow-md transition-all cursor-pointer
        ${className}
      `}
    >
      <span className={language === 'es' ? 'text-forest-green' : 'text-warm-brown/50'}>ES</span>
      <span className="text-warm-brown/30">|</span>
      <span className={language === 'en' ? 'text-forest-green' : 'text-warm-brown/50'}>EN</span>
    </button>
  );
}
