import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LanguageSelector } from '../ui/language-selector';

export function NameInputScreen() {
  const { t } = useTranslation();
  const { mode, multiplayerIntent, players, setPlayerName, setScreen } = useGameStore();

  const canContinue = players[0].name.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    if (multiplayerIntent === 'join') {
      setScreen('join-room');
    } else {
      setScreen('category-select');
    }
  };

  const handleBack = () => {
    setScreen(mode === 'solo' ? 'welcome' : 'multiplayer-menu');
  };

  return (
    <div
      data-testid="name-input-screen"
      className="min-h-screen bg-mesh-green relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <div className="blob blob-green w-64 h-64 -top-20 -left-20" style={{ animationDelay: '-3s' }} />
      <div className="blob blob-orange w-48 h-48 -bottom-16 -right-16" style={{ animationDelay: '-10s' }} />

      <LanguageSelector className="absolute top-6 right-6 z-10" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 relative z-10"
      >
        <h1 className="font-title text-3xl md:text-4xl font-extrabold text-forest-green">
          {t('nameInput.title')}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-md space-y-5 relative z-10"
      >
        <div className="glass-strong rounded-2xl p-5">
          <label className="block text-base font-bold text-warm-brown mb-2">
            {t('config.playerName')}
          </label>
          <Input
            value={players[0].name}
            onChange={(val) => setPlayerName(0, val)}
            placeholder={t('config.namePlaceholder')}
            required
            maxLength={20}
            data-testid="player-name-input"
          />
        </div>

        <Button
          fullWidth
          disabled={!canContinue}
          onClick={handleContinue}
          data-testid="name-continue-button"
        >
          {t('config.continue')}
        </Button>

        <div className="flex justify-center">
          <Button variant="ghost" onClick={handleBack}>
            {t('common.back')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
