export const VICTORY_POINTS = 150;
export const TURN_TIMER = 180;
export const TRIVIA_TIMER = 60;

export const TIMER_THRESHOLDS = {
  green: { min: 120, max: 180 },
  yellow: { min: 60, max: 119 },
  red: { min: 0, max: 59 },
} as const;

export const GRID_ROWS = 10;
export const GRID_COLS = 12;

export const ROOM_CODE_LENGTH = 4;

export const BOT_NAME = 'Socrates';
export const BOT_THINK_MIN = 3000;
export const BOT_THINK_MAX = 7000;
export const BOT_ACCURACY = 0.7;

export const CATEGORIES = [
  'history',
  'language',
  'science',
  'philosophy',
  'art',
  'geography',
] as const;

export const FEEDBACK_CORRECT_DURATION = 4000;
export const FEEDBACK_INCORRECT_DURATION = 4000;

export const HINT_LETTER_COST = 3;
export const TRIVIA_HINT_COST = 5;
