import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { useRoom } from '../../hooks/use-room';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { LanguageSelector } from '../ui/language-selector';

export function JoinRoomScreen() {
  const { t } = useTranslation();
  const { players, setScreen } = useGameStore();
  const room = useRoom();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const canJoin = joinCode.trim().length === 4;

  const handleJoin = async () => {
    if (!canJoin) return;
    setIsJoining(true);
    const success = await room.joinRoom(joinCode.toUpperCase(), players[0].name);
    setIsJoining(false);
    if (success) {
      setScreen('waiting-room');
    }
  };

  return (
    <div
      data-testid="join-room-screen"
      className="min-h-screen bg-mesh-vibrant relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <div className="blob blob-purple w-64 h-64 -top-20 -right-20" style={{ animationDelay: '-5s' }} />
      <div className="blob blob-orange w-48 h-48 -bottom-16 -left-16" style={{ animationDelay: '-12s' }} />

      <LanguageSelector className="absolute top-6 right-6 z-10" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10 relative z-10"
      >
        <h1 className="font-title text-3xl md:text-4xl font-extrabold text-night-blue">
          {t('config.joinRoom')}
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-md space-y-5 relative z-10"
      >
        <div className="glass-strong rounded-2xl p-5">
          <label className="block text-base font-bold text-warm-brown mb-1">
            {t('config.enterCode')}
          </label>
          <p className="text-sm text-warm-brown/70 mb-3">{t('config.roomCodePlaceholder')}</p>
          <Input
            value={joinCode}
            onChange={(val) => setJoinCode(val.toUpperCase().slice(0, 4))}
            placeholder={t('config.roomCodePlaceholder')}
            maxLength={4}
            data-testid="join-code-input"
          />
        </div>

        <Button
          fullWidth
          disabled={!canJoin || isJoining}
          onClick={handleJoin}
          data-testid="join-room-button"
        >
          {isJoining ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size="sm" /> {t('common.loading')}
            </span>
          ) : t('config.joinRoom')}
        </Button>

        {room.error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-strong rounded-2xl p-4 border border-crimson/20"
          >
            <p className="text-crimson text-base text-center font-medium flex items-center justify-center gap-2">
              <span>⚠️</span>
              {t(`errors.${room.error}`, { defaultValue: room.error })}
            </p>
          </motion.div>
        )}

        <div className="flex justify-center">
          <Button variant="ghost" onClick={() => setScreen('name-input')}>
            {t('common.back')}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
