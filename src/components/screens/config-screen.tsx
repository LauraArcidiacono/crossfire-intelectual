import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { useRoom } from '../../hooks/use-room';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
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

  const room = useRoom();
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const toggleCategory = (cat: Category) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  // Solo: name + categories required
  // Multiplayer create: name + categories required
  // Multiplayer join: name + code required (no categories needed)
  const canCreateRoom =
    players[0].name.trim().length > 0 && selectedCategories.length >= 1;

  const canJoinRoom =
    players[0].name.trim().length > 0 && joinCode.trim().length === 4;

  const canContinueSolo =
    players[0].name.trim().length > 0 && selectedCategories.length >= 1;

  const handleSoloContinue = async () => {
    if (!canContinueSolo) return;
    useGameStore.getState().setPlayerName(1, BOT_NAME);
    const crossword = await getRandomCrossword(language);
    startGame(crossword);
    setScreen('game');
  };

  const handleCreateRoom = async () => {
    if (!canCreateRoom) return;
    const code = await room.createRoom(players[0].name, selectedCategories, language);
    if (code) {
      setScreen('waiting-room');
    }
  };

  const handleJoinRoom = async () => {
    if (!canJoinRoom) return;
    setIsJoining(true);
    const success = await room.joinRoom(joinCode.toUpperCase(), players[0].name);
    setIsJoining(false);
    if (success) {
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
        {/* Player name */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-strong rounded-2xl p-5"
        >
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
        </motion.div>

        {/* Categories (shown for solo and multiplayer create) */}
        {(mode === 'solo' || mode === 'multiplayer') && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-strong rounded-2xl p-5"
          >
            <label className="block text-base font-bold text-warm-brown mb-2">
              {t('config.categories')}
            </label>
            <p className="text-sm text-warm-brown/70 mb-3">{t('config.categoriesHint')}</p>

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
                    <span className={`text-base font-semibold ${isSelected ? 'text-forest-green' : 'text-warm-brown'}`}>
                      {t(`config.${cat}`)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Solo: continue button */}
        {mode === 'solo' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              fullWidth
              disabled={!canContinueSolo}
              onClick={handleSoloContinue}
              data-testid="continue-button"
            >
              {t('config.continue')}
            </Button>
          </motion.div>
        )}

        {/* Multiplayer: Create or Join */}
        {mode === 'multiplayer' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                fullWidth
                disabled={!canCreateRoom || room.roomStatus === 'creating'}
                onClick={handleCreateRoom}
                data-testid="create-room-button"
              >
                {room.roomStatus === 'creating' ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" /> {t('common.loading')}
                  </span>
                ) : t('config.createRoom')}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-strong rounded-2xl p-5"
            >
              <label className="block text-base font-bold text-warm-brown mb-1">
                {t('config.orJoinRoom')}
              </label>
              <p className="text-sm text-warm-brown/70 mb-3">{t('config.enterCode')}</p>
              <Input
                value={joinCode}
                onChange={(val) => setJoinCode(val.toUpperCase().slice(0, 4))}
                placeholder={t('config.roomCodePlaceholder')}
                maxLength={4}
                data-testid="join-code-input"
              />
              <div className="mt-3">
                <Button
                  fullWidth
                  variant="secondary"
                  disabled={!canJoinRoom || isJoining}
                  onClick={handleJoinRoom}
                  data-testid="join-room-button"
                >
                  {isJoining ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" /> {t('common.loading')}
                    </span>
                  ) : t('config.joinRoom')}
                </Button>
              </div>
            </motion.div>

            {room.error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-2xl p-4 border border-crimson/20"
              >
                <p className="text-crimson text-base text-center font-medium flex items-center justify-center gap-2">
                  <span>&#9888;&#65039;</span>
                  {t(`errors.${room.error}`, { defaultValue: room.error })}
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
