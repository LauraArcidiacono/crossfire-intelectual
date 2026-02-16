import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/game-store';
import {
  createGameChannel,
  sendMove,
  onMove,
  subscribeToRoom,
  syncGameState,
  setupPresence,
} from '../lib/networking';
import { getCrosswordById } from '../lib/data-loader';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { GameMove, SyncableGameState } from '../types/game.types';

export function useOnlineGame() {
  const store = useGameStore();
  const [isConnected, setIsConnected] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const gameChannelRef = useRef<RealtimeChannel | null>(null);
  const roomChannelRef = useRef<RealtimeChannel | null>(null);
  const moveCallbackRef = useRef<((move: GameMove) => void) | null>(null);

  const isOnline = store.mode === 'multiplayer' && store.roomId !== null;
  const isHost = store.playerRole === 'host';
  const isGuest = store.playerRole === 'guest';

  // Extract syncable state from store for broadcasting
  const extractSyncableState = useCallback((): SyncableGameState | null => {
    const s = useGameStore.getState();
    if (!s.crossword) return null;
    return {
      currentTurn: s.currentTurn,
      players: s.players,
      completedWords: s.completedWords,
      turnPhase: s.turnPhase,
      currentQuestion: s.currentQuestion,
      lastFeedback: s.lastFeedback,
      selectedWordId: s.selectedWordId,
      cellInputs: s.cellInputs,
      status: s.status,
      gameStats: s.gameStats,
      wordCompletions: s.wordCompletions,
      crosswordId: s.crossword.id,
      timeRemaining: s.timeRemaining,
      triviaTimeRemaining: s.triviaTimeRemaining,
    };
  }, [
    store.currentTurn,
    store.players,
    store.completedWords,
    store.turnPhase,
    store.currentQuestion,
    store.lastFeedback,
    store.selectedWordId,
    store.cellInputs,
    store.status,
    store.gameStats,
    store.wordCompletions,
    store.crossword,
    store.timeRemaining,
    store.triviaTimeRemaining,
  ]);

  // Host: sync state to Supabase after mutations
  const hostSyncState = useCallback(async () => {
    if (!isHost || !store.roomId) return;
    const state = extractSyncableState();
    if (state) {
      await syncGameState(store.roomId, state);
    }
  }, [isHost, store.roomId, extractSyncableState]);

  // Set up channels when game starts online
  useEffect(() => {
    if (!isOnline || !store.roomId) return;

    const roomId = store.roomId;
    const role = store.playerRole;

    // Game broadcast channel (for guest→host moves)
    const gameChannel = createGameChannel(roomId);
    gameChannelRef.current = gameChannel;

    if (role === 'host') {
      // Host listens for guest moves
      onMove(gameChannel, (move: GameMove) => {
        if (moveCallbackRef.current) {
          moveCallbackRef.current(move);
        }
      });
    }

    // Subscribe the channel
    gameChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
      }
    });

    // Presence for disconnect detection
    const userId = role === 'host' ? 'host' : 'guest';
    setupPresence(gameChannel, userId, (presentUsers) => {
      const expectedOpponent = role === 'host' ? 'guest' : 'host';
      const opponentPresent = presentUsers.includes(expectedOpponent);
      setOpponentDisconnected(!opponentPresent && presentUsers.length > 0);
    });

    // Guest: subscribe to room changes to receive game state updates during gameplay
    if (role === 'guest') {
      const roomChannel = subscribeToRoom(roomId, {
        onGameStateChanged: (state: SyncableGameState) => {
          const current = useGameStore.getState();

          // Load new crossword if ID changed (e.g. rematch)
          if (state.crosswordId && (!current.crossword || current.crossword.id !== state.crosswordId)) {
            const crossword = getCrosswordById(state.crosswordId, current.language);
            if (crossword) {
              useGameStore.getState().startGame(crossword);
            }
          }

          useGameStore.getState().applySyncedState(state);
        },
        onStatusChanged: (status) => {
          if (status === 'finished') {
            useGameStore.getState().setStatus('finished');
            useGameStore.getState().setScreen('victory');
          }
        },
      });
      roomChannelRef.current = roomChannel;
    }

    return () => {
      if (gameChannelRef.current) {
        gameChannelRef.current.unsubscribe();
        gameChannelRef.current = null;
      }
      if (roomChannelRef.current) {
        roomChannelRef.current.unsubscribe();
        roomChannelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isOnline, store.roomId, store.playerRole]);

  // Host: auto-sync state when relevant store values change
  useEffect(() => {
    if (!isHost || !isOnline || store.status === 'waiting') return;
    hostSyncState();
  }, [
    isHost,
    isOnline,
    store.currentTurn,
    store.players,
    store.completedWords,
    store.turnPhase,
    store.currentQuestion,
    store.lastFeedback,
    store.selectedWordId,
    store.cellInputs,
    store.status,
    store.gameStats,
    store.wordCompletions,
    store.timeRemaining,
    store.triviaTimeRemaining,
  ]);

  // Guest: send move to host
  const sendGameMove = useCallback(
    (move: GameMove) => {
      if (!isGuest || !gameChannelRef.current) return;
      sendMove(gameChannelRef.current, move);
    },
    [isGuest]
  );

  // Host: register callback for guest moves
  const onGuestMove = useCallback((callback: (move: GameMove) => void) => {
    moveCallbackRef.current = callback;
  }, []);

  return {
    isConnected,
    opponentDisconnected,
    sendGameMove,
    onGuestMove,
    hostSyncState,
    isOnline,
    isHost,
    isGuest,
  };
}
