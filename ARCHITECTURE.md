# Crossfire Intellectual - Architecture & Contracts

## 1. Project Overview

**Crossfire Intellectual** is a hybrid crossword + trivia game designed for 1-2 players. Players compete to fill in a shared crossword grid by answering trivia questions from six categories. The first player to reach **150 points** wins the match.

**Core loop:** Select a word on the crossword, answer the associated trivia question, and if correct the word is revealed on the grid and points are awarded. Players alternate turns until one reaches the victory threshold.

**Game modes:**
- **Solo** - Single player vs. a bot opponent
- **Local** - Two players on the same device
- **Online** - Two players connected via Supabase Realtime

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | React 18 + TypeScript | UI and application logic |
| **Build tool** | Vite | Fast dev server and production bundling |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Backend / Realtime** | Supabase | Auth, database, and realtime multiplayer |
| **State management** | Zustand | Lightweight global state |
| **Animations** | Framer Motion | Declarative animations and transitions |
| **Sound** | Howler.js | Cross-browser audio playback |
| **Internationalization** | react-i18next | Multi-language support (EN/ES) |
| **E2E Testing** | Playwright | Browser-based end-to-end tests |

---

## 3. TypeScript Interfaces

All shared types live in `src/types/game.types.ts`.

### Type Aliases

```typescript
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
```

### Player

```typescript
export interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
}
```

### GameState

```typescript
export interface GameState {
  currentTurn: 1 | 2;
  players: [Player, Player];
  completedWords: number[];
  timeRemaining: number;
  status: GameStatus;
}
```

### CrosswordGrid

```typescript
export interface CrosswordGrid {
  rows: number;
  cols: number;
  blackCells: [number, number][];
  prefilled: { row: number; col: number; letter: string }[];
}
```

### Word

```typescript
export interface Word {
  id: number;
  word: string;
  clue: string;
  category: Category;
  direction: Direction;
  row: number;
  col: number;
}
```

### Crossword

```typescript
export interface Crossword {
  id: number;
  title: string;
  grid: CrosswordGrid;
  words: Word[];
}
```

### Question

```typescript
export interface Question {
  id: string;
  question: string;
  type: QuestionType;
  answer: string;
  options?: [string, string, string, string];
  category: Category;
  difficulty: Difficulty;
}
```

---

## 4. Function Signatures

### 4.1 Game Logic (`src/lib/gameLogic.ts`)

```typescript
function initializeGame(crossword: Crossword, players: [Player, Player]): GameState;

function selectWord(state: GameState, wordId: number): GameState;

function submitAnswer(state: GameState, wordId: number, answer: string): {
  state: GameState;
  correct: boolean;
  pointsAwarded: number;
};

function switchTurn(state: GameState): GameState;

function checkVictory(state: GameState): { finished: boolean; winner: Player | null };

function calculatePoints(difficulty: Difficulty, timeRemaining: number): number;

function getAvailableWords(crossword: Crossword, completedWords: number[]): Word[];
```

### 4.2 Bot Logic (`src/lib/botLogic.ts`)

```typescript
function botSelectWord(availableWords: Word[], difficulty: Difficulty): Word;

function botAnswerQuestion(question: Question, difficulty: Difficulty): {
  answer: string;
  delay: number;
};

function getBotAccuracy(difficulty: Difficulty): number;
```

### 4.3 Networking (`src/lib/networking.ts`)

```typescript
function createRoom(hostPlayer: Player): Promise<string>;

function joinRoom(roomCode: string, guestPlayer: Player): Promise<boolean>;

function subscribeToRoom(roomCode: string, onUpdate: (state: GameState) => void): () => void;

function sendMove(roomCode: string, move: { wordId: number; answer: string }): Promise<void>;

function leaveRoom(roomCode: string, playerId: string): Promise<void>;
```

### 4.4 Data Layer (`src/lib/dataLoader.ts`)

```typescript
function loadCrossword(crosswordId: number): Promise<Crossword>;

function loadQuestions(category: Category, difficulty: Difficulty): Promise<Question[]>;

function getRandomCrossword(): Promise<Crossword>;

function getQuestionForWord(wordId: number, category: Category): Promise<Question>;
```

---

## 5. Supabase Database Schema

### Table: `rooms`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique room identifier |
| `code` | `text` | UNIQUE, NOT NULL | 6-character room code for joining |
| `host_id` | `text` | NOT NULL | Player ID of the host |
| `guest_id` | `text` | NULLABLE | Player ID of the guest |
| `status` | `text` | NOT NULL, default `'waiting'` | Room status: `waiting`, `playing`, `finished` |
| `created_at` | `timestamptz` | default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | default `now()` | Last update timestamp |

### Table: `games`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique game identifier |
| `room_id` | `uuid` | FK -> rooms.id, NOT NULL | Associated room |
| `crossword_id` | `integer` | NOT NULL | ID of the crossword being played |
| `state` | `jsonb` | NOT NULL | Full serialized `GameState` |
| `current_turn` | `integer` | NOT NULL, default `1` | Current turn (1 or 2) |
| `winner_id` | `text` | NULLABLE | Player ID of the winner |
| `created_at` | `timestamptz` | default `now()` | Creation timestamp |
| `updated_at` | `timestamptz` | default `now()` | Last update timestamp |

### Table: `crosswords`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `integer` | PK | Crossword identifier |
| `title` | `text` | NOT NULL | Display title |
| `grid` | `jsonb` | NOT NULL | Serialized `CrosswordGrid` |
| `words` | `jsonb` | NOT NULL | Array of serialized `Word` objects |
| `difficulty` | `text` | NOT NULL | Overall difficulty: `easy`, `medium`, `hard` |
| `created_at` | `timestamptz` | default `now()` | Creation timestamp |

### Realtime

Supabase Realtime is enabled on the `rooms` and `games` tables. Clients subscribe to changes on their room's row to receive live game state updates.

---

## 6. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Variables & functions** | camelCase | `currentTurn`, `submitAnswer` |
| **Components** | PascalCase | `GameBoard`, `QuestionModal` |
| **Files (components)** | kebab-case | `game-board.tsx`, `question-modal.tsx` |
| **Files (hooks)** | camelCase with `use` prefix | `useGameState.ts`, `useTimer.ts` |
| **Files (types)** | kebab-case with `.types` suffix | `game.types.ts` |
| **Files (constants)** | kebab-case | `colors.ts`, `scoring.ts` |
| **CSS classes** | Tailwind utilities | `bg-forest-green text-cream` |
| **Zustand stores** | camelCase with `use` prefix + `Store` suffix | `useGameStore`, `useSettingsStore` |
| **Supabase tables** | snake_case | `rooms`, `games`, `crosswords` |
| **Supabase columns** | snake_case | `host_id`, `current_turn` |
| **Enums / union types** | kebab-case strings | `'multiple-choice'`, `'waiting-room'` |
| **i18n keys** | dot-separated namespaces | `game.score`, `welcome.startButton` |
| **Test files** | same name + `.test` suffix | `game-board.test.tsx` |

---

## 7. Color Palette - "Modern Library"

| Name | Hex | Usage |
|------|-----|-------|
| **Forest Green** | `#2C5530` | Primary buttons, active states, success indicators |
| **Terracotta** | `#C65D3B` | Accent, wrong-answer feedback, highlights |
| **Cream** | `#F5E6D3` | Background, card surfaces |
| **Gold** | `#B8860B` | Points display, achievements, star ratings |
| **Night Blue** | `#1E3A5F` | Headers, dark-mode backgrounds, player 2 accent |
| **Sage Green** | `#5E7C61` | Secondary buttons, subtle borders, hover states |
| **Warm Brown** | `#8B4513` | Text on light backgrounds, crossword grid lines |
| **Crimson** | `#DC143C` | Error states, timer warnings, critical alerts |

### Tailwind Configuration

These colors should be registered in `tailwind.config.ts` under `theme.extend.colors`:

```typescript
colors: {
  'forest-green': '#2C5530',
  'terracotta': '#C65D3B',
  'cream': '#F5E6D3',
  'gold': '#B8860B',
  'night-blue': '#1E3A5F',
  'sage-green': '#5E7C61',
  'warm-brown': '#8B4513',
  'crimson': '#DC143C',
}
```

---

## 8. Typography

| Role | Font Family | Weight | Usage |
|------|------------|--------|-------|
| **Titles** | Playfair Display | 700 (Bold) | Page headings, game title, victory screen |
| **Body** | Inter | 400 (Regular), 600 (Semi-Bold) | Paragraphs, buttons, labels, questions |
| **Monospace** | JetBrains Mono | 400 (Regular) | Crossword cells, timer display, room codes |

### Font Loading

Fonts are loaded via Google Fonts in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
```

### Tailwind Configuration

```typescript
fontFamily: {
  'display': ['"Playfair Display"', 'serif'],
  'body': ['Inter', 'sans-serif'],
  'mono': ['"JetBrains Mono"', 'monospace'],
}
```
