import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { useRoom } from '../../hooks/use-room';
import { useSound } from '../../hooks/use-sound';
import { useHaptics } from '../../hooks/use-haptics';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';

export function WaitingRoomScreen() {
  const { t } = useTranslation();
  const store = useGameStore();
  const room = useRoom();
  const { play } = useSound();
  const { vibrate } = useHaptics();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  const isHost = store.playerRole === 'host';
  const isGuest = store.playerRole === 'guest';
  const guestHasJoined = room.guestName !== null || isGuest || (isHost && store.players[1].name.trim().length > 0);

  const canStart = isHost && guestHasJoined;

  const handleCopyCode = useCallback(async () => {
    if (!store.roomCode) return;
    try {
      await navigator.clipboard.writeText(store.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }, [store.roomCode]);

  const handleShare = useCallback(async () => {
    if (!store.roomCode) return;
    const text = t('waitingRoom.shareText', { code: store.roomCode });
    if (canShare) {
      try {
        await navigator.share({ title: 'Crossfire Intellectual', text });
      } catch {
        // User cancelled
      }
    } else {
      await handleCopyCode();
    }
  }, [store.roomCode, t, canShare, handleCopyCode]);

  // Shared countdown logic used by both host and guest
  const startCountdown = useCallback(() => {
    if (countdown !== null) return; // already running
    setCountdown(3);
    play('countdown-tick');
    vibrate('countdown');
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          play('countdown-go');
          vibrate('success');
          room.navigateToGame();
          return null;
        }
        play('countdown-tick');
        vibrate('countdown');
        return prev - 1;
      });
    }, 1000);
  }, [countdown, play, vibrate, room]);

  // Host: prepare game, then start countdown
  const handleStart = async () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    // Sync initial state to Supabase first — this triggers the guest's countdown
    await room.prepareOnlineGame();
    setIsStarting(false);
    startCountdown();
  };

  // Guest: start countdown when room status becomes 'countdown'
  useEffect(() => {
    if (isGuest && room.roomStatus === 'countdown') {
      startCountdown();
    }
  }, [isGuest, room.roomStatus, startCountdown]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleLeave = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    await room.leaveRoom();
    store.resetGame();
  };

  return (
    <div
      data-testid="waiting-room-screen"
      className="min-h-screen bg-mesh-vibrant relative overflow-hidden flex flex-col items-center justify-center px-6"
    >
      <div className="blob blob-green w-64 h-64 -top-20 -left-20 opacity-25" style={{ animationDelay: '-4s' }} />
      <div className="blob blob-purple w-56 h-56 bottom-10 -right-16 opacity-25" style={{ animationDelay: '-9s' }} />

      {/* Countdown overlay */}
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
        className="text-center mb-6 relative z-10"
      >
        <h2 className="font-title text-3xl font-extrabold text-forest-green mb-2">
          {isHost
            ? (guestHasJoined ? t('waitingRoom.readyTitle') : t('waitingRoom.roomCode'))
            : t('waitingRoom.readyTitle')
          }
        </h2>
        <p className="text-base text-warm-brown/80">
          {isHost
            ? (guestHasJoined ? t('waitingRoom.readySubtitle') : t('waitingRoom.shareCode'))
            : t('waitingRoom.waitingForHost')
          }
        </p>
      </motion.div>

      {/* Room code display (host) */}
      {isHost && store.roomCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 relative z-10"
        >
          <div className="glass-strong rounded-3xl p-6 text-center">
            <p className="text-sm text-warm-brown/70 font-semibold mb-2">{t('waitingRoom.roomCode')}</p>
            <div className="flex items-center justify-center gap-3">
              <span
                data-testid="room-code"
                className="font-mono text-5xl font-extrabold text-forest-green tracking-[0.3em] select-all"
              >
                {store.roomCode}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCopyCode}
                className="px-4 py-1.5 rounded-full text-sm font-bold bg-forest-green/10 text-forest-green border border-forest-green/20 hover:bg-forest-green/20 transition-colors"
              >
                {copied ? t('waitingRoom.copied') : t('waitingRoom.copyCode')}
              </motion.button>
              {canShare && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleShare}
                  className="px-4 py-1.5 rounded-full text-sm font-bold bg-terracotta/10 text-terracotta border border-terracotta/20 hover:bg-terracotta/20 transition-colors"
                >
                  {t('waitingRoom.shareButton')}
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Guest: show connected room */}
      {isGuest && store.roomCode && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 relative z-10"
        >
          <div className="glass-strong rounded-3xl p-6 text-center">
            <p className="text-sm text-warm-brown/70 font-semibold mb-1">{t('waitingRoom.connectedTo')}</p>
            <span className="font-mono text-3xl font-extrabold text-night-blue tracking-[0.2em]">
              {store.roomCode}
            </span>
          </div>
        </motion.div>
      )}

      {/* Players */}
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md mb-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 glass-strong rounded-2xl p-5 text-center"
        >
          <p className="text-sm text-warm-brown/70 font-semibold mb-1">{t('waitingRoom.player1')}</p>
          <p className="font-title font-extrabold text-forest-green text-lg">{store.players[0].name || '—'}</p>
          {isHost && <span className="text-sm text-forest-green/60 font-medium">HOST</span>}
        </motion.div>

        <div className="text-warm-brown font-title font-extrabold text-xl">VS</div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 glass-strong rounded-2xl p-5 text-center"
        >
          <p className="text-sm text-warm-brown/70 font-semibold mb-1">{t('waitingRoom.player2')}</p>
          {guestHasJoined ? (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <p className="font-title font-extrabold text-night-blue text-lg">
                {isHost ? (room.guestName || store.players[1].name) : store.players[1].name}
              </p>
            </motion.div>
          ) : (
            <motion.p
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-base text-warm-brown/50 italic"
            >
              {t('waitingRoom.waitingForOpponent')}
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 relative z-10"
      >
        <p className="text-sm text-warm-brown/70 font-semibold mb-2 text-center">{t('waitingRoom.selectedCategories')}</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {store.selectedCategories.map((cat) => (
            <span
              key={cat}
              className="px-3 py-1 bg-forest-green/15 text-forest-green text-base font-semibold rounded-full backdrop-blur-sm"
            >
              {t(`config.${cat}`)}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Guest joined notification (host only) */}
      <AnimatePresence>
        {isHost && room.guestName && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 relative z-10"
          >
            <p className="text-base text-forest-green font-semibold">
              {room.guestName} {t('waitingRoom.guestJoined')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3 relative z-10"
      >
        <Button variant="ghost" onClick={handleLeave}>
          {t('waitingRoom.back')}
        </Button>
        {isHost && (
          <Button disabled={!canStart || isStarting} onClick={handleStart}>
            {isStarting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> {t('common.loading')}
              </span>
            ) : t('waitingRoom.startGame')}
          </Button>
        )}
      </motion.div>
    </div>
  );
}
