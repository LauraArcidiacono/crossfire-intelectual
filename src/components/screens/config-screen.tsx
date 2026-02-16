import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LanguageSelector } from '../ui/language-selector';
import { getRandomCrossword } from '../../lib/data-loader';
import { BOT_NAME, CATEGORIES } from '../../constants/game-config';
import type { Category } from '../../types/game.types';

const CATEGORY_ICONS: Record<Category, string> = {
  history: '📜',
  language: '📖',
  science: '🔬',
  philosophy: '💭',
  art: '🎨',
  geography: '🌍',
};

export function ConfigScreen() {
  const { t } = useTranslation();
  const {
    mode,
    players,
    selectedCategories,
    language,
    setPlayerName,
    setSelectedCategories,
    setScreen,
    startGame,
  } = useGameStore();

  const toggleCategory = (cat: Category) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const canContinue =
    players[0].name.trim().length > 0 &&
    selectedCategories.length >= 1 &&
    (mode === 'solo' || players[1].name.trim().length > 0);

  const handleContinue = () => {
    if (!canContinue) return;

    if (mode === 'solo') {
      useGameStore.getState().setPlayerName(1, BOT_NAME);
      const crossword = getRandomCrossword(language);
      startGame(crossword);
      setScreen('game');
    } else {
      setScreen('waiting-room');
    }
  };

  return (
    <div
      data-testid="config-screen"
      className="min-h-screen bg-mesh-green relative overflow-hidden flex flex-col items-center px-6 py-10"
    >
      <div className="blob blob-green w-64 h-64 -top-20 -left-20" style={{ animationDelay: '-3s' }} />
      <div className="blob blob-orange w-48 h-48 top-1/2 -right-20" style={{ animationDelay: '-10s' }} />

      <LanguageSelector className="absolute top-6 right-6 z-10" />

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-title text-3xl font-extrabold text-forest-green mb-8 mt-8 relative z-10 text-center"
      >
        {mode === 'solo' ? t('welcome.playSolo') : t('welcome.playMulti')}
      </motion.h1>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-strong rounded-2xl p-5"
        >
          <label className="block text-sm font-bold text-warm-brown mb-2">
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
        </motion.div>

        {mode === 'multiplayer' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-strong rounded-2xl p-5"
          >
            <label className="block text-sm font-bold text-warm-brown mb-2">
              {t('waitingRoom.player2')}
            </label>
            <Input
              value={players[1].name}
              onChange={(val) => setPlayerName(1, val)}
              placeholder={t('config.namePlaceholder')}
              maxLength={20}
            />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-strong rounded-2xl p-5"
        >
          <label className="block text-sm font-bold text-warm-brown mb-2">
            {t('config.categories')}
          </label>
          <p className="text-xs text-warm-brown/70 mb-3">{t('config.categoriesHint')}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <motion.div
                  key={cat}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleCategory(cat)}
                  className={`
                    text-center py-3 px-2 rounded-xl cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-forest-green/15 ring-2 ring-forest-green shadow-md shadow-forest-green/15'
                      : 'bg-white/60 hover:bg-white/80 border border-warm-brown/15 shadow-sm'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{CATEGORY_ICONS[cat]}</div>
                  <span className={`text-sm font-semibold ${isSelected ? 'text-forest-green' : 'text-warm-brown'}`}>
                    {t(`config.${cat}`)}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            fullWidth
            disabled={!canContinue}
            onClick={handleContinue}
            data-testid="continue-button"
          >
            {t('config.continue')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
