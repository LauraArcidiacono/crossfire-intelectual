import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { Button } from '../ui/button';
import { LanguageSelector } from '../ui/language-selector';

export function MultiplayerMenuScreen() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);
  const setMultiplayerIntent = useGameStore((s) => s.setMultiplayerIntent);

  const handleCreate = () => {
    setMultiplayerIntent('create');
    setScreen('name-input');
  };

  const handleJoin = () => {
    setMultiplayerIntent('join');
    setScreen('name-input');
  };

  return (
    <div
      data-testid="multiplayer-menu-screen"
      className="min-h-screen bg-mesh-vibrant relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <div className="blob blob-purple w-72 h-72 -top-20 -right-20" style={{ animationDelay: '-5s' }} />
      <div className="blob blob-orange w-64 h-64 -bottom-20 -left-20" style={{ animationDelay: '-12s' }} />

      <LanguageSelector className="absolute top-6 right-6 z-10" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 relative z-10"
      >
        <h1 className="font-title text-3xl md:text-4xl font-extrabold text-night-blue mb-2">
          {t('welcome.playMulti')}
        </h1>
        <p className="font-body text-base text-warm-brown/80">
          {t('multiMenu.title')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 w-full max-w-lg relative z-10"
      >
        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCreate}
          data-testid="create-room-option"
          className="flex-1 glass-strong rounded-3xl p-6 text-center cursor-pointer shadow-lg shadow-night-blue/10 hover:shadow-xl hover:shadow-night-blue/20 transition-shadow"
        >
          <div className="text-4xl mb-3">🏠</div>
          <h2 className="font-title text-xl font-bold text-night-blue mb-1">
            {t('config.createRoom')}
          </h2>
          <p className="text-sm text-warm-brown/80">
            {t('multiMenu.createDesc')}
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.03, y: -4 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleJoin}
          data-testid="join-room-option"
          className="flex-1 glass-strong rounded-3xl p-6 text-center cursor-pointer shadow-lg shadow-gold/10 hover:shadow-xl hover:shadow-gold/20 transition-shadow"
        >
          <div className="text-4xl mb-3">🎮</div>
          <h2 className="font-title text-xl font-bold text-warm-brown mb-1">
            {t('config.joinRoom')}
          </h2>
          <p className="text-sm text-warm-brown/80">
            {t('multiMenu.joinDesc')}
          </p>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-8 relative z-10"
      >
        <Button variant="ghost" onClick={() => setScreen('welcome')}>
          {t('common.back')}
        </Button>
      </motion.div>
    </div>
  );
}
