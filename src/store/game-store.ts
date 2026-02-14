import { create } from 'zustand';
import type {
  Category,
  Crossword,
  GameStatus,
  Player,
  Question,
  Screen,
} from '../types/game.types';

interface GameSlice {
  status: GameStatus;
  currentTurn: 1 | 2;
  players: [Player, Player];
  completedWords: number[];
  timeRemaining: number;
  selectedCategories: Category[];
  crossword: Crossword | null;
  currentQuestion: Question | null;
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
  resetGame: () => void;
}

type GameStore = GameSlice & UISlice & Actions;

const initialGameState: GameSlice = {
  status: 'waiting',
  currentTurn: 1,
  players: [
    { id: '1', name: '', score: 0, isReady: false },
    { id: '2', name: '', score: 0, isReady: false },
  ],
  completedWords: [],
  timeRemaining: 180,
  selectedCategories: [],
  crossword: null,
  currentQuestion: null,
};

const initialUIState: UISlice = {
  currentScreen: 'welcome',
  language: 'es',
  soundEnabled: true,
  volume: 0.7,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialGameState,
  ...initialUIState,

  startGame: (crossword) =>
    set({
      status: 'playing',
      crossword,
      completedWords: [],
      currentTurn: 1,
      timeRemaining: 180,
      currentQuestion: null,
    }),

  switchTurn: () =>
    set((state) => ({
      currentTurn: state.currentTurn === 1 ? 2 : 1,
      timeRemaining: 180,
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

  resetGame: () => set({ ...initialGameState, ...initialUIState }),
}));
