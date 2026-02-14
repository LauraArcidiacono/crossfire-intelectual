import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { getWinner } from '../../lib/game-logic';
import { getRandomCrossword } from '../../lib/data-loader';
import { Button } from '../ui/button';
import { Confetti } from '../ui/confetti';

export function VictoryScreen() {
  const { t } = useTranslation();
  const store = useGameStore();
  const winner = getWinner(store.players);
  const isTie = winner === null;

  const handleRematch = () => {
    const crossword = getRandomCrossword(store.language);
    store.startGame(crossword);
    store.setScreen('game');
  };

  const handleBackToMenu = () => {
    store.resetGame();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      data-testid="victory-screen"
      className="min-h-screen bg-mesh-vibrant relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <div className="blob blob-green w-72 h-72 -top-24 -right-24 opacity-25" style={{ animationDelay: '-3s' }} />
      <div className="blob blob-purple w-64 h-64 bottom-10 -left-20 opacity-25" style={{ animationDelay: '-10s' }} />
      <div className="blob blob-orange w-56 h-56 top-1/2 right-10 opacity-20" style={{ animationDelay: '-7s' }} />

      <Confetti trigger />

      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 12 }}
        className="text-center mb-8 relative z-10"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-7xl mb-4"
        >
          🏆
        </motion.div>
        <h1 className="font-title text-4xl font-extrabold text-forest-green mb-2 drop-shadow-sm">
          {isTie ? t('victory.tie') : t('victory.winner')}
        </h1>
        {!isTie && (
          <p className="font-title text-2xl text-night-blue font-extrabold">{winner.name}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-strong rounded-3xl p-6 w-full max-w-md mb-8 relative z-10"
      >
        <h2 className="font-title text-lg font-extrabold text-forest-green mb-4 text-center">
          {t('victory.statsTitle')}
        </h2>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-warm-brown/15">
              <th className="text-left py-2 text-warm-brown/70 font-semibold" />
              <th className="text-center py-2 text-forest-green font-bold">
                {store.players[0].name}
              </th>
              <th className="text-center py-2 text-night-blue font-bold">
                {store.players[1].name}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-warm-brown/10">
              <td className="py-2.5 text-warm-brown font-medium">{t('victory.finalScore')}</td>
              <td className="text-center font-mono font-extrabold text-forest-green text-lg">
                {store.players[0].score}
              </td>
              <td className="text-center font-mono font-extrabold text-night-blue text-lg">
                {store.players[1].score}
              </td>
            </tr>
            <tr className="border-b border-warm-brown/10">
              <td className="py-2.5 text-warm-brown font-medium">{t('victory.wordsCompleted')}</td>
              <td className="text-center font-mono font-semibold text-warm-brown">
                {store.gameStats.wordsCompletedByPlayer[0]}
              </td>
              <td className="text-center font-mono font-semibold text-warm-brown">
                {store.gameStats.wordsCompletedByPlayer[1]}
              </td>
            </tr>
            <tr className="border-b border-warm-brown/10">
              <td className="py-2.5 text-warm-brown font-medium">{t('victory.correctAnswers')}</td>
              <td className="text-center font-mono font-semibold text-warm-brown">
                {store.gameStats.correctAnswersByPlayer[0]}
              </td>
              <td className="text-center font-mono font-semibold text-warm-brown">
                {store.gameStats.correctAnswersByPlayer[1]}
              </td>
            </tr>
            <tr>
              <td className="py-2.5 text-warm-brown font-medium">{t('victory.timePlayed')}</td>
              <td colSpan={2} className="text-center font-mono font-semibold text-warm-brown">
                {formatTime(store.gameStats.totalTimePlayed)}
              </td>
            </tr>
          </tbody>
        </table>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 relative z-10"
      >
        <Button variant="primary" onClick={handleRematch}>
          {t('victory.rematch')}
        </Button>
        <Button variant="ghost" onClick={handleBackToMenu}>
          {t('victory.backToMenu')}
        </Button>
      </motion.div>
    </div>
  );
}
