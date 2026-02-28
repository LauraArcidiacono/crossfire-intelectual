import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { Button } from '../ui/button';
import { LanguageSelector } from '../ui/language-selector';

export function WelcomeScreen() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const setMode = useGameStore((s) => s.setMode);

  const handleSolo = () => {
    setMode('solo');
    const hasSeenTutorial = localStorage.getItem('crossfire-tutorial-seen');
    setScreen(hasSeenTutorial ? 'name-input' : 'tutorial');
  };

  const handleMulti = () => {
    setMode('multiplayer');
    const hasSeenTutorial = localStorage.getItem('crossfire-tutorial-seen');
    setScreen(hasSeenTutorial ? 'multiplayer-menu' : 'tutorial');
  };

  return (
    <div
      data-testid="welcome-screen"
      className="min-h-screen bg-mesh-vibrant relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      {/* Background blobs */}
      <div className="blob blob-green w-72 h-72 -top-20 -left-20" style={{ animationDelay: '0s' }} />
      <div className="blob blob-purple w-80 h-80 top-1/3 -right-32" style={{ animationDelay: '-7s', animation: 'float-slow 25s ease-in-out infinite' }} />
      <div className="blob blob-orange w-64 h-64 -bottom-20 left-1/4" style={{ animationDelay: '-14s' }} />

      <LanguageSelector className="absolute top-6 right-6 z-10" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 className="font-title text-3xl md:text-5xl font-extrabold text-forest-green mb-3 tracking-tight drop-shadow-sm">
          {t('welcome.title')}
        </h1>
        <p className="font-body text-base md:text-lg text-warm-brown/80 font-medium">
          {t('welcome.subtitle')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 w-full max-w-lg relative z-10"
      >
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSolo}
          data-testid="play-solo"
          className="flex-1 glass-strong rounded-3xl p-6 text-center cursor-pointer shadow-lg shadow-forest-green/10 hover:shadow-xl hover:shadow-forest-green/20 transition-shadow"
        >
          <div className="text-4xl mb-3">🧠</div>
          <h2 className="font-title text-xl font-bold text-forest-green mb-1">
            {t('welcome.playSolo')}
          </h2>
          <p className="text-sm text-warm-brown/80">
            {t('welcome.soloDescription')}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleMulti}
          data-testid="play-multi"
          className="flex-1 glass-strong rounded-3xl p-6 text-center cursor-pointer shadow-lg shadow-night-blue/10 hover:shadow-xl hover:shadow-night-blue/20 transition-shadow"
        >
          <div className="text-4xl mb-3">⚔️</div>
          <h2 className="font-title text-xl font-bold text-night-blue mb-1">
            {t('welcome.playMulti')}
          </h2>
          <p className="text-sm text-warm-brown/80">
            {t('welcome.multiDescription')}
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 relative z-10"
      >
        <Button
          variant="ghost"
          onClick={() => setScreen('tutorial')}
          data-testid="how-to-play"
        >
          {t('welcome.tutorial')}
        </Button>
      </motion.div>
    </div>
  );
}
