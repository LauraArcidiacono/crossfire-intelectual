import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/game-store';
import {
  createRoom as createRoomApi,
  joinRoom as joinRoomApi,
  subscribeToRoom,
  syncGameState,
  leaveRoom as leaveRoomApi,
  cleanupStaleRooms,
} from '../lib/networking';
import { getCrosswordById, getRandomCrossword } from '../lib/data-loader';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Category, SyncableGameState } from '../types/game.types';

type RoomHookStatus = 'idle' | 'creating' | 'waiting' | 'joining' | 'ready' | 'countdown' | 'error';

export function useRoom() {
  // Derive initial state from the global store so it survives screen changes
  const [roomStatus, setRoomStatus] = useState<RoomHookStatus>(() => {
    const s = useGameStore.getState();
    if (!s.roomId) return 'idle';
    if (s.playerRole === 'host') {
      return s.players[1].name.trim() ? 'ready' : 'waiting';
    }
    if (s.playerRole === 'guest') return 'ready';
    return 'idle';
  });

  const [guestName, setGuestName] = useState<string | null>(() => {
    const s = useGameStore.getState();
    if (s.playerRole === 'host' && s.players[1].name.trim()) {
      return s.players[1].name;
    }
    return null;
  });

  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Subscribe to room changes whenever we have an active room.
  useEffect(() => {
    const s = useGameStore.getState();
    if (!s.roomId || !s.playerRole) return;

    channelRef.current = subscribeToRoom(s.roomId, {
      onGuestJoined: (guest) => {
        const current = useGameStore.getState();
        if (current.playerRole === 'host') {
          useGameStore.getState().setPlayerName(1, guest);
          setGuestName(guest);
          setRoomStatus('ready');
        }
      },
      onStatusChanged: () => {
        // Status changes are handled via onGameStateChanged for guests
      },
      onGameStateChanged: (state: SyncableGameState) => {
        const current = useGameStore.getState();
        if (current.playerRole !== 'guest') return;

        // Load crossword if not loaded yet (first sync = game start)
        if (!current.crossword && state.crosswordId) {
          getCrosswordById(state.crosswordId, current.language).then((crossword) => {
            if (crossword) {
              useGameStore.getState().startGame(crossword);
            }
            useGameStore.getState().applySyncedState(state);
            // Trigger countdown after crossword is loaded
            if (useGameStore.getState().currentScreen === 'waiting-room') {
              setRoomStatus('countdown');
            }
          });
          return;
        }

        useGameStore.getState().applySyncedState(state);

        // If guest is still in the waiting room, trigger countdown instead of jumping straight to game
        if (useGameStore.getState().currentScreen === 'waiting-room' && state.status === 'playing') {
          setRoomStatus('countdown');
          return;
        }

        // If already in game (e.g. ongoing state updates), just apply — no navigation needed
        // If on another screen (e.g. victory → rematch), navigate
        if (useGameStore.getState().currentScreen !== 'game' && useGameStore.getState().currentScreen !== 'waiting-room' && state.status === 'playing') {
          useGameStore.getState().setScreen('game');
        }
      },
    });

    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  }, []);

  const createRoom = useCallback(
    async (name: string, categories: Category[], language: 'es' | 'en') => {
      setRoomStatus('creating');
      setError(null);

      // Opportunistic cleanup of stale rooms (fire-and-forget)
      cleanupStaleRooms().catch(() => {});

      const { room, error: err } = await createRoomApi(name, categories, language);

      if (err || !room) {
        setError(err || 'create_failed');
        setRoomStatus('error');
        return null;
      }

      useGameStore.getState().setRoomId(room.id);
      useGameStore.getState().setRoomCode(room.code);
      useGameStore.getState().setPlayerRole('host');
      useGameStore.getState().setPlayerName(0, name);
      useGameStore.getState().setSelectedCategories(categories);

      setRoomStatus('waiting');
      return room.code;
    },
    []
  );

  const joinRoom = useCallback(
    async (code: string, name: string) => {
      setRoomStatus('joining');
      setError(null);

      const { room, error: err } = await joinRoomApi(code, name);

      if (err || !room) {
        setError(err || 'room_not_found');
        setRoomStatus('error');
        return false;
      }

      useGameStore.getState().setRoomId(room.id);
      useGameStore.getState().setRoomCode(room.code);
      useGameStore.getState().setPlayerRole('guest');
      useGameStore.getState().setPlayerName(1, name);
      useGameStore.getState().setPlayerName(0, room.hostName);
      useGameStore.getState().setSelectedCategories(room.categories);
      useGameStore.getState().setLanguage(room.language);

      setGuestName(name);
      setRoomStatus('ready');
      return true;
    },
    []
  );

  // Prepare the game: sync initial state to Supabase (called BEFORE countdown)
  const prepareOnlineGame = useCallback(async () => {
    const s = useGameStore.getState();
    const roomId = s.roomId;
    if (!roomId || s.playerRole !== 'host') return;

    const crossword = await getRandomCrossword(s.language);
    useGameStore.getState().startGame(crossword);

    // Fire-and-forget: send sync to guest without awaiting confirmation.
    // This lets host start its countdown at the same moment the signal is sent,
    // so both countdowns begin as close together as possible.
    const current = useGameStore.getState();
    syncGameState(roomId, {
      currentTurn: current.currentTurn,
      players: current.players,
      completedWords: current.completedWords,
      turnPhase: current.turnPhase,
      currentQuestion: current.currentQuestion,
      lastFeedback: current.lastFeedback,
      selectedWordId: current.selectedWordId,
      cellInputs: current.cellInputs,
      status: current.status,
      gameStats: current.gameStats,
      wordCompletions: current.wordCompletions,
      crosswordId: crossword.id,
      timeRemaining: current.timeRemaining,
      triviaTimeRemaining: current.triviaTimeRemaining,
    });
  }, []);

  // Navigate to game screen (called AFTER countdown)
  const navigateToGame = useCallback(() => {
    useGameStore.getState().setScreen('game');
  }, []);

  const leaveCurrentRoom = useCallback(async () => {
    const roomId = useGameStore.getState().roomId;
    if (roomId) {
      await leaveRoomApi(roomId);
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setRoomStatus('idle');
    setGuestName(null);
    setError(null);
  }, []);

  return {
    createRoom,
    joinRoom,
    prepareOnlineGame,
    navigateToGame,
    leaveRoom: leaveCurrentRoom,
    roomStatus,
    guestName,
    error,
  };
}
