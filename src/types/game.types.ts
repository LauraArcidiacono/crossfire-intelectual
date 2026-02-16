export type Category = 'history' | 'language' | 'science' | 'philosophy' | 'art' | 'geography';
export type QuestionType = 'open' | 'multiple-choice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Direction = 'across' | 'down';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type GameMode = 'solo' | 'multiplayer';
export type TurnPhase = 'selecting' | 'typing' | 'submitted' | 'question' | 'feedback';

export type Screen =
  | 'welcome'
  | 'tutorial'
  | 'config'
  | 'waiting-room'
  | 'game'
  | 'victory';

export interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
}

export interface GameState {
  currentTurn: 1 | 2;
  players: [Player, Player];
  completedWords: number[];
  timeRemaining: number;
  status: GameStatus;
}

export interface CrosswordGrid {
  rows: number;
  cols: number;
  blackCells: [number, number][];
  prefilled: { row: number; col: number; letter: string }[];
}

export interface Word {
  id: number;
  word: string;
  clue: string;
  category: Category;
  direction: Direction;
  row: number;
  col: number;
}

export interface Crossword {
  id: number;
  title: string;
  grid: CrosswordGrid;
  words: Word[];
}

export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  answer: string;
  options: [string, string, string, string];
  category: Category;
  difficulty: Difficulty;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface LastFeedback {
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswer?: string;
}

export interface GameStats {
  wordsCompletedByPlayer: [number, number];
  correctAnswersByPlayer: [number, number];
  totalTimePlayed: number;
}

export interface WordCompletion {
  wordId: number;
  playerIndex: 0 | 1;
  points: number;
}

// Online multiplayer types
export type PlayerRole = 'host' | 'guest';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  id: string;
  code: string;
  hostName: string;
  guestName: string | null;
  categories: Category[];
  crosswordId: number | null;
  status: RoomStatus;
  language: 'es' | 'en';
}

// Subset of game state synced from host → guest via Supabase
export interface SyncableGameState {
  currentTurn: 1 | 2;
  players: [Player, Player];
  completedWords: number[];
  turnPhase: TurnPhase;
  currentQuestion: Question | null;
  lastFeedback: LastFeedback | null;
  selectedWordId: number | null;
  cellInputs: Record<string, string>;
  status: GameStatus;
  gameStats: GameStats;
  wordCompletions: WordCompletion[];
  crosswordId: number;
  timeRemaining: number;
  triviaTimeRemaining: number;
}

// Guest → host actions sent via Realtime broadcast
export type GameMove =
  | { type: 'select-word'; wordId: number }
  | { type: 'cell-input'; key: string; letter: string }
  | { type: 'submit-word'; wordId: number }
  | { type: 'submit-answer'; answer: string; usedHint: boolean }
  | { type: 'timeout' }
  | { type: 'hint' };
