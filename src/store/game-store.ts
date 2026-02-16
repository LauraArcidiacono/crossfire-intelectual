import { create } from 'zustand';
import type {
  Category,
  CellPosition,
  Crossword,
  GameMode,
  GameStats,
  GameStatus,
  LastFeedback,
  Player,
  PlayerRole,
  Question,
  Screen,
  SyncableGameState,
  TurnPhase,
  WordCompletion,
} from '../types/game.types';
import { TURN_TIMER } from '../constants/game-config';

const SESSION_KEY = 'crossfire-game-session';

function saveSession(state: GameSlice & UISlice) {
  if (state.status !== 'playing') {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  try {
    const serializable = {
      ...state,
      usedQuestionIds: Array.from(state.usedQuestionIds),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(serializable));
  } catch {
    // Storage full or unavailable — ignore
  }
}

function loadSession(): Partial<GameSlice & UISlice> | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.status !== 'playing') return null;
    return {
      ...parsed,
      usedQuestionIds: new Set(parsed.usedQuestionIds || []),
    };
  } catch {
    return null;
  }
}

interface GameSlice {
  status: GameStatus;
  mode: GameMode;
  currentTurn: 1 | 2;
  players: [Player, Player];
  completedWords: number[];
  timeRemaining: number;
  selectedCategories: Category[];
  crossword: Crossword | null;
  currentQuestion: Question | null;
  selectedWordId: number | null;
  cellInputs: Record<string, string>;
  selectedCell: CellPosition | null;
  triviaTimeRemaining: number;
  turnPhase: TurnPhase;
  lastFeedback: LastFeedback | null;
  gameStats: GameStats;
  wordCompletions: WordCompletion[];
  usedQuestionIds: Set<string>;
  gameStartedAt: number | null;
  roomId: string | null;
  roomCode: string | null;
  playerRole: PlayerRole | null;
}

interface UISlice {
  currentScreen: Screen;
  language: 'es' | 'en';
  soundEnabled: boolean;
  volume: number;
}

interface Actions {
  startGame: (crossword: Crossword) => void;
  switchTurn: () => void;
  completeWord: (wordId: number) => void;
  updateScore: (playerIndex: 0 | 1, points: number) => void;
  setScreen: (screen: Screen) => void;
  setLanguage: (language: 'es' | 'en') => void;
  setSoundEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setPlayerName: (playerIndex: 0 | 1, name: string) => void;
  setPlayerReady: (playerIndex: 0 | 1, isReady: boolean) => void;
  setSelectedCategories: (categories: Category[]) => void;
  setCurrentQuestion: (question: Question | null) => void;
  setTimeRemaining: (time: number) => void;
  setStatus: (status: GameStatus) => void;
  setMode: (mode: GameMode) => void;
  selectWord: (wordId: number | null) => void;
  setCellInput: (key: string, letter: string) => void;
  clearCellInputs: () => void;
  setSelectedCell: (cell: CellPosition | null) => void;
  setTriviaTimeRemaining: (time: number) => void;
  setTurnPhase: (phase: TurnPhase) => void;
  setLastFeedback: (feedback: LastFeedback | null) => void;
  incrementWordStats: (playerIndex: 0 | 1) => void;
  incrementAnswerStats: (playerIndex: 0 | 1) => void;
  addUsedQuestionId: (id: string) => void;
  recordWordCompletion: (completion: WordCompletion) => void;
  setGameStats: (stats: GameStats) => void;
  setRoomId: (id: string | null) => void;
  setRoomCode: (code: string | null) => void;
  setPlayerRole: (role: PlayerRole | null) => void;
  applySyncedState: (state: SyncableGameState) => void;
  resetGame: () => void;
}

type GameStore = GameSlice & UISlice & Actions;

const initialGameState: GameSlice = {
  status: 'waiting',
  mode: 'solo',
  currentTurn: 1,
  players: [
    { id: '1', name: '', score: 0, isReady: false },
    { id: '2', name: '', score: 0, isReady: false },
  ],
  completedWords: [],
  timeRemaining: TURN_TIMER,
  selectedCategories: [],
  crossword: null,
  currentQuestion: null,
  selectedWordId: null,
  cellInputs: {},
  selectedCell: null,
  triviaTimeRemaining: 60,
  turnPhase: 'selecting',
  lastFeedback: null,
  gameStats: {
    wordsCompletedByPlayer: [0, 0],
    correctAnswersByPlayer: [0, 0],
    totalTimePlayed: 0,
  },
  wordCompletions: [],
  usedQuestionIds: new Set(),
  gameStartedAt: null,
  roomId: null,
  roomCode: null,
  playerRole: null,
};

const initialUIState: UISlice = {
  currentScreen: 'welcome',
  language: 'es',
  soundEnabled: true,
  volume: 0.7,
};

const restoredSession = loadSession();

export const useGameStore = create<GameStore>((set) => ({
  ...initialGameState,
  ...initialUIState,
  ...(restoredSession || {}),

  startGame: (crossword) =>
    set((state) => ({
      status: 'playing',
      crossword,
      players: [
        { ...state.players[0], score: 0 },
        { ...state.players[1], score: 0 },
      ] as [Player, Player],
      completedWords: [],
      currentTurn: 1,
      timeRemaining: TURN_TIMER,
      currentQuestion: null,
      selectedWordId: null,
      cellInputs: {},
      selectedCell: null,
      turnPhase: 'selecting',
      lastFeedback: null,
      gameStats: {
        wordsCompletedByPlayer: [0, 0],
        correctAnswersByPlayer: [0, 0],
        totalTimePlayed: 0,
      },
      wordCompletions: [],
      usedQuestionIds: new Set(),
      gameStartedAt: Date.now(),
    })),

  switchTurn: () =>
    set((state) => ({
      currentTurn: state.currentTurn === 1 ? 2 : 1,
      timeRemaining: TURN_TIMER,
      selectedWordId: null,
      selectedCell: null,
      turnPhase: 'selecting',
      lastFeedback: null,
      currentQuestion: null,
    })),

  completeWord: (wordId) =>
    set((state) => ({
      completedWords: [...state.completedWords, wordId],
    })),

  updateScore: (playerIndex, points) =>
    set((state) => {
      const players = [...state.players] as [Player, Player];
      players[playerIndex] = {
        ...players[playerIndex],
        score: players[playerIndex].score + points,
      };
      return { players };
    }),

  setScreen: (screen) => set({ currentScreen: screen }),
  setLanguage: (language) => set({ language }),
  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
  setVolume: (volume) => set({ volume }),

  setPlayerName: (playerIndex, name) =>
    set((state) => {
      const players = [...state.players] as [Player, Player];
      players[playerIndex] = { ...players[playerIndex], name };
      return { players };
    }),

  setPlayerReady: (playerIndex, isReady) =>
    set((state) => {
      const players = [...state.players] as [Player, Player];
      players[playerIndex] = { ...players[playerIndex], isReady };
      return { players };
    }),

  setSelectedCategories: (categories) =>
    set({ selectedCategories: categories }),

  setCurrentQuestion: (question) => set({ currentQuestion: question }),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setStatus: (status) => set({ status }),
  setMode: (mode) => set({ mode }),
  selectWord: (wordId) => set({ selectedWordId: wordId, turnPhase: wordId ? 'typing' : 'selecting' }),
  setCellInput: (key, letter) =>
    set((state) => ({
      cellInputs: { ...state.cellInputs, [key]: letter.toUpperCase() },
    })),
  clearCellInputs: () => set({ cellInputs: {} }),
  setSelectedCell: (cell) => set({ selectedCell: cell }),
  setTriviaTimeRemaining: (time) => set({ triviaTimeRemaining: time }),
  setTurnPhase: (phase) => set({ turnPhase: phase }),
  setLastFeedback: (feedback) => set({ lastFeedback: feedback }),

  incrementWordStats: (playerIndex) =>
    set((state) => {
      const stats = { ...state.gameStats };
      const words = [...stats.wordsCompletedByPlayer] as [number, number];
      words[playerIndex] += 1;
      return { gameStats: { ...stats, wordsCompletedByPlayer: words } };
    }),

  incrementAnswerStats: (playerIndex) =>
    set((state) => {
      const stats = { ...state.gameStats };
      const answers = [...stats.correctAnswersByPlayer] as [number, number];
      answers[playerIndex] += 1;
      return { gameStats: { ...stats, correctAnswersByPlayer: answers } };
    }),

  addUsedQuestionId: (id) =>
    set((state) => {
      const usedQuestionIds = new Set(state.usedQuestionIds);
      usedQuestionIds.add(id);
      return { usedQuestionIds };
    }),

  recordWordCompletion: (completion) =>
    set((state) => ({
      wordCompletions: [...state.wordCompletions, completion],
    })),

  setGameStats: (stats) => set({ gameStats: stats }),

  setRoomId: (id) => set({ roomId: id }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPlayerRole: (role) => set({ playerRole: role }),

  applySyncedState: (state: SyncableGameState) =>
    set({
      currentTurn: state.currentTurn,
      players: state.players,
      completedWords: state.completedWords,
      turnPhase: state.turnPhase,
      currentQuestion: state.currentQuestion,
      lastFeedback: state.lastFeedback,
      selectedWordId: state.selectedWordId,
      cellInputs: state.cellInputs,
      status: state.status,
      gameStats: state.gameStats,
      wordCompletions: state.wordCompletions,
      timeRemaining: state.timeRemaining,
      triviaTimeRemaining: state.triviaTimeRemaining,
    }),

  resetGame: () => {
    sessionStorage.removeItem(SESSION_KEY);
    return set({ ...initialGameState, ...initialUIState });
  },
}));

// Auto-save session on every state change during active games
useGameStore.subscribe((state) => {
  saveSession(state);
});
