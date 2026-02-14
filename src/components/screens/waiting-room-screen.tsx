import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { Button } from '../ui/button';
import { getRandomCrossword } from '../../lib/data-loader';

export function WaitingRoomScreen() {
  const { t } = useTranslation();
  const {
    players,
    selectedCategories,
    language,
    startGame,
    setScreen,
  } = useGameStore();
  const [countdown, setCountdown] = useState<number | null>(null);

  const canStart = players[0].name.trim().length > 0 && players[1].name.trim().length > 0;

  const handleStart = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          const crossword = getRandomCrossword(language);
          startGame(crossword);
          setScreen('game');
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div
      data-testid="waiting-room-screen"
      className="min-h-screen bg-mesh-vibrant relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <div className="blob blob-green w-64 h-64 -top-20 -left-20 opacity-25" style={{ animationDelay: '-4s' }} />
      <div className="blob blob-purple w-56 h-56 bottom-10 -right-16 opacity-25" style={{ animationDelay: '-9s' }} />

      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-forest-green/90 backdrop-blur-sm"
          >
            <span className="font-title text-9xl text-white font-extrabold drop-shadow-lg">
              {countdown === 0 ? 'GO!' : countdown}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 relative z-10"
      >
        <h2 className="font-title text-3xl font-extrabold text-forest-green mb-2">
          {t('waitingRoom.readyTitle')}
        </h2>
        <p className="text-sm text-warm-brown/80">{t('waitingRoom.readySubtitle')}</p>
      </motion.div>

      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mb-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 glass-strong rounded-2xl p-5 text-center"
        >
          <p className="text-xs text-warm-brown/70 font-semibold mb-1">{t('waitingRoom.player1')}</p>
          <p className="font-title font-extrabold text-forest-green text-lg">{players[0].name || '—'}</p>
        </motion.div>

        <div className="text-warm-brown font-title font-extrabold text-xl">VS</div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 glass-strong rounded-2xl p-5 text-center"
        >
          <p className="text-xs text-warm-brown/70 font-semibold mb-1">{t('waitingRoom.player2')}</p>
          <p className="font-title font-extrabold text-night-blue text-lg">{players[1].name || '—'}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 relative z-10"
      >
        <p className="text-xs text-warm-brown/70 font-semibold mb-2 text-center">{t('waitingRoom.selectedCategories')}</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {selectedCategories.map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 bg-forest-green/15 text-forest-green text-sm font-semibold rounded-full backdrop-blur-sm"
            >
              {t(`config.${cat}`)}
            </span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10"
      >
        <Button disabled={!canStart} onClick={handleStart}>
          {t('waitingRoom.startGame')}
        </Button>
      </motion.div>
    </div>
  );
}
