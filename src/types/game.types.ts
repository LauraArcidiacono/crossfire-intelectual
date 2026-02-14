export type Category = 'history' | 'language' | 'science' | 'philosophy' | 'art' | 'geography';
export type QuestionType = 'open' | 'multiple-choice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Direction = 'across' | 'down';
export type GameStatus = 'waiting' | 'playing' | 'finished';

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
  options?: [string, string, string, string];
  category: Category;
  difficulty: Difficulty;
}
