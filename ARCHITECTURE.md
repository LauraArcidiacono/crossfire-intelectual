# Crossfire Intellectual - Architecture & Contracts

## 1. Tech Stack (with versions)

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React + TypeScript | ^18.3.1 | UI and application logic |
| **Build tool** | Vite | ^6.0.0 | Fast dev server and production bundling |
| **Styling** | Tailwind CSS v4 | ^4.1.18 | Utility-first CSS with `@theme` configuration |
| **Backend / Realtime** | Supabase | ^2.95.3 | Database and realtime multiplayer |
| **State management** | Zustand | ^5.0.11 | Single global store with session persistence |
| **Animations** | Framer Motion | ^12.34.0 | Declarative animations and transitions |
| **Sound** | Howler.js | ^2.2.4 | Cross-browser audio playback (SFX + music) |
| **Internationalization** | react-i18next | ^16.5.4 | Multi-language support (EN/ES) |
| **PWA** | vite-plugin-pwa | ^1.2.0 | Offline support, installable app |
| **E2E Testing** | Playwright | ^1.58.2 | Browser-based end-to-end tests |

---

## 2. TypeScript Interfaces

All shared types live in `src/types/game.types.ts`.

### Type Aliases

```typescript
export type Category = 'history' | 'language' | 'science' | 'philosophy' | 'art' | 'geography';
export type QuestionType = 'open' | 'multiple-choice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Direction = 'across' | 'down';
export type GameStatus = 'waiting' | 'playing' | 'finished';
export type GameMode = 'solo' | 'multiplayer';
export type TurnPhase = 'selecting' | 'typing' | 'submitted' | 'question' | 'feedback';
export type PlayerRole = 'host' | 'guest';
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type Screen =
  | 'welcome'
  | 'tutorial'
  | 'multiplayer-menu'
  | 'name-input'
  | 'category-select'
  | 'join-room'
  | 'waiting-room'
  | 'game'
  | 'victory';
```

### Core Data Types

```typescript
export interface Player {
  id: string;
  name: string;
  score: number;
  isReady: boolean;
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
```

### Game State Types

```typescript
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

export interface GameState {
  currentTurn: 1 | 2;
  players: [Player, Player];
  completedWords: number[];
  timeRemaining: number;
  status: GameStatus;
}
```

### Multiplayer Types

```typescript
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

export type GameMove =
  | { type: 'select-word'; wordId: number }
  | { type: 'cell-input'; key: string; letter: string }
  | { type: 'submit-word'; wordId: number }
  | { type: 'submit-answer'; answer: string; usedHint: boolean }
  | { type: 'timeout' }
  | { type: 'hint' };
```

---

## 3. Function Signatures

### 3.1 Game Logic (`src/lib/game-logic.ts`)

```typescript
function validateWord(word: Word, input: string): boolean;

function normalizeForComparison(text: string): string;

function validateAnswer(question: Question, answer: string): boolean;

function calculateScore(word: Word, isCorrect: boolean): number;

function getAvailableWords(crossword: Crossword, completedWords: number[]): Word[];

function checkVictoryCondition(
  players: [Player, Player],
  completedWords: number[],
  crossword: Crossword
): 'playing' | 'victory' | 'tie';

function getWinner(players: [Player, Player]): Player | null;
```

Scoring uses Scrabble letter values (`src/constants/scrabble-values.ts`). Correct trivia answers earn 2x the word's Scrabble score; incorrect answers earn 1x. Answer validation supports exact match, keyword matching, and substring containment for open questions.

### 3.2 Crossword Utilities (`src/lib/crossword.ts`)

```typescript
function isBlackCell(grid: CrosswordGrid, row: number, col: number): boolean;

function getPrefilledLetter(grid: CrosswordGrid, row: number, col: number): string | null;

function cellKey(row: number, col: number): string;

function getWordCells(word: Word): CellPosition[];

function getWordsAtCell(crossword: Crossword, row: number, col: number): Word[];

function buildWordInput(word: Word, cellInputs: Record<string, string>, grid: CrosswordGrid): string;

function getNextCell(current: CellPosition, direction: Direction, word: Word): CellPosition | null;

function getPreviousCell(current: CellPosition, word: Word): CellPosition | null;

function isWordFullyFilled(word: Word, cellInputs: Record<string, string>, grid: CrosswordGrid): boolean;

function getHintCell(
  word: Word,
  cellInputs: Record<string, string>,
  grid: CrosswordGrid
): { row: number; col: number; letter: string } | null;
```

### 3.3 Bot Logic (`src/lib/bot.ts`)

```typescript
function botSelectWord(availableWords: Word[]): Word;

function botAnswerQuestion(question: Question): { answer: string; isCorrect: boolean };

function getBotThinkDelay(): number;
```

Bot accuracy is fixed at 70% (`BOT_ACCURACY = 0.7`). Think delay ranges from 3-8 seconds.

### 3.4 Networking (`src/lib/networking.ts`)

```typescript
function generateRoomCode(): string;

function createRoom(
  hostName: string,
  categories: Category[],
  language: 'es' | 'en'
): Promise<{ room: Room | null; error: string | null }>;

function joinRoom(
  code: string,
  guestName: string
): Promise<{ room: Room | null; error: string | null }>;

function subscribeToRoom(
  roomId: string,
  callbacks: {
    onGuestJoined?: (guestName: string) => void;
    onStatusChanged?: (status: RoomStatus) => void;
    onGameStateChanged?: (state: SyncableGameState) => void;
  }
): RealtimeChannel;

function updateRoomStatus(roomId: string, status: RoomStatus): Promise<void>;

function syncGameState(roomId: string, state: SyncableGameState): Promise<void>;

function createGameChannel(roomId: string): RealtimeChannel;

function sendMove(channel: RealtimeChannel, move: GameMove): void;

function onMove(channel: RealtimeChannel, callback: (move: GameMove) => void): RealtimeChannel;

function setupPresence(
  channel: RealtimeChannel,
  userId: string,
  onPresenceChange: (presentUsers: string[]) => void
): void;

function leaveRoom(roomId: string): Promise<void>;

function cleanupStaleRooms(): Promise<void>;

function getRoomByCode(code: string): Promise<{ room: Room | null; error: string | null }>;
```

Multiplayer uses a host/guest architecture: the host manages game state and syncs it to the `rooms` table via `game_state` JSONB column. The guest sends moves via Realtime broadcast, and receives state updates via postgres_changes subscription. Presence tracking detects disconnections.

### 3.5 Data Layer (`src/lib/data-loader.ts`)

```typescript
function loadCrosswords(language: Language): Promise<Crossword[]>;

function loadQuestions(language: Language): Promise<Record<string, Question[]>>;

function getRandomCrossword(language: Language): Promise<Crossword>;

function getCrosswordById(id: number, language: Language): Promise<Crossword | undefined>;

function getRandomQuestion(
  categories: Category[],
  language: Language,
  usedIds: Set<string>
): Promise<Question | null>;

function getQuestionForCategory(
  category: Category,
  language: Language,
  usedIds: Set<string>
): Promise<Question | null>;

function shuffleOptions(options: string[]): string[];
```

Data is loaded via dynamic `import()` from `src/data/crosswords/{en,es}.json` and `src/data/questions/{en,es}.json`. Both datasets are cached per language after first load.

### 3.6 Sound Manager (`src/lib/sound.ts`)

```typescript
class SoundManager {
  init(): void;
  play(name: SoundName): void;
  playMusic(name: MusicName): void;
  stopMusic(): void;
  setEnabled(enabled: boolean): void;
  setVolume(volume: number): void;
  isEnabled(): boolean;
  stopAll(): void;
}

type SoundName = 'click' | 'reveal' | 'question' | 'correct' | 'incorrect'
               | 'victory' | 'turn' | 'timeout' | 'countdown-tick' | 'countdown-go';
type MusicName = 'music-game' | 'music-victory';
```

Singleton instance exported as `soundManager`. Auto-pauses music on tab visibility change.

### 3.7 Supabase Client (`src/lib/supabase.ts`)

```typescript
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## 4. Supabase Database Schema

### Table: `rooms`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Unique room identifier |
| `code` | `text` | UNIQUE, NOT NULL | 4-character alphanumeric room code |
| `host_name` | `text` | NOT NULL | Display name of the host player |
| `guest_name` | `text` | NULLABLE | Display name of the guest player |
| `categories` | `jsonb` | NOT NULL | Array of selected trivia categories |
| `crossword_id` | `integer` | NULLABLE | ID of the crossword being played |
| `language` | `text` | NOT NULL | Game language: `'en'` or `'es'` |
| `game_state` | `jsonb` | NULLABLE | Full serialized `SyncableGameState` |
| `status` | `text` | NOT NULL, default `'waiting'` | Room status: `waiting`, `playing`, `finished` |
| `created_at` | `timestamptz` | default `now()` | Creation timestamp |

### Realtime

- **postgres_changes**: Clients subscribe to UPDATE events on their room row to receive live game state updates.
- **broadcast**: Guest-to-host move communication via `game:${roomId}` channel.
- **presence**: Disconnect detection via `game:${roomId}` channel presence tracking.

Stale rooms (>24h) are opportunistically cleaned up by `cleanupStaleRooms()`.

---

## 5. State Management

Single Zustand store (`src/store/game-store.ts`) combining game state and UI state:

```typescript
// UI state (persisted via i18next localStorage)
interface UISlice {
  currentScreen: Screen;
  language: 'es' | 'en';
  soundEnabled: boolean;
  volume: number;
}

// Game state (persisted to sessionStorage during active games)
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
  turnPhase: TurnPhase;
  lastFeedback: LastFeedback | null;
  gameStats: GameStats;
  wordCompletions: WordCompletion[];
  usedQuestionIds: Set<string>;
  // ... multiplayer fields: roomId, roomCode, playerRole
}
```

Session persistence: active game state is saved to `sessionStorage` on every state change and restored on page reload.

---

## 6. Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Variables & functions** | camelCase | `currentTurn`, `validateAnswer` |
| **Components** | PascalCase | `GameScreen`, `QuestionModal` |
| **Files (components)** | kebab-case | `game-screen.tsx`, `question-modal.tsx` |
| **Files (hooks)** | kebab-case with `use-` prefix | `use-game-state.ts`, `use-timer.ts` |
| **Files (lib)** | kebab-case | `game-logic.ts`, `data-loader.ts` |
| **Files (types)** | kebab-case with `.types` suffix | `game.types.ts` |
| **Files (constants)** | kebab-case | `game-config.ts`, `scrabble-values.ts` |
| **CSS classes** | Tailwind utilities + custom `.glass-*`, `.bg-mesh-*` | `bg-forest-green text-cream glass` |
| **Zustand store** | `useGameStore` (single store) | `useGameStore()` |
| **Supabase tables** | snake_case | `rooms` |
| **Supabase columns** | snake_case | `host_name`, `game_state` |
| **Enums / union types** | kebab-case strings | `'multiple-choice'`, `'waiting-room'` |
| **i18n keys** | dot-separated namespaces | `game.score`, `welcome.startButton` |
| **Test files** | kebab-case with `.spec.ts` suffix | `e2e-solo.spec.ts`, `disconnect.spec.ts` |

---

## 7. Color Palette

| Name | CSS Variable | Hex | Usage |
|------|-------------|-----|-------|
| **Forest Green** | `--color-forest-green` | `#589C48` | Primary buttons, active states, success |
| **Terracotta** | `--color-terracotta` | `#F58024` | Accent, orange highlights |
| **Cream** | `--color-cream` | `#F0F4F0` | Card surfaces, light backgrounds |
| **Gold** | `--color-gold` | `#FBB149` | Points display, achievements |
| **Night Blue** | `--color-night-blue` | `#733381` | Purple accent (despite name), opponent highlights |
| **Sage Green** | `--color-sage-green` | `#7BB662` | Secondary green, hover states |
| **Warm Brown** | `--color-warm-brown` | `#3A3A3A` | Primary text color |
| **Crimson** | `--color-crimson` | `#DC143C` | Error states, timer warnings |
| **Light Purple** | `--color-light-purple` | `#9B64A7` | Secondary purple accent |

### Tailwind CSS v4 Configuration

Colors and fonts are defined in `src/index.css` using the `@theme` directive (no `tailwind.config.ts`):

```css
@import "tailwindcss";

@theme {
  --color-forest-green: #589C48;
  --color-terracotta: #F58024;
  --color-cream: #F0F4F0;
  /* ... */

  --font-title: 'Plus Jakarta Sans', 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

Custom CSS utility classes: `.glass`, `.glass-strong`, `.glass-dark` (glassmorphism), `.bg-mesh-green`, `.bg-mesh-game`, `.bg-mesh-vibrant` (gradient backgrounds), `.blob-*` (animated background blobs), `.glow-*` (box-shadow effects), `.btn-gradient-*` (button gradients).

---

## 8. Typography

| Role | Font Family | Weight | Usage |
|------|------------|--------|-------|
| **Titles** | Plus Jakarta Sans | 400–800 | Page headings, game title, victory screen |
| **Body** | Inter | 400–800 | Paragraphs, buttons, labels, questions |
| **Monospace** | JetBrains Mono | 400–700 | Crossword cells, timer display, room codes |

Fonts loaded via Google Fonts in `index.html`.

---

## 9. Project Structure

```
src/
  components/
    screens/       # welcome, tutorial, multiplayer-menu, name-input,
                   # category-select, join-room, waiting-room, game, victory
                   # + question-modal, feedback-overlay
    ui/            # button, card, input, modal, spinner, badge, confetti,
                   # timer-display, language-selector
  hooks/           # use-game-state, use-online-game, use-room, use-crossword,
                   # use-timer, use-sound, use-haptics
  store/           # game-store (single Zustand store)
  lib/             # game-logic, crossword, bot, networking, supabase,
                   # data-loader, sound
  constants/       # game-config, scrabble-values
  data/
    crosswords/    # en.json, es.json
    questions/     # en.json, es.json
  types/           # game.types.ts
  i18n/
    config.ts
    locales/       # en.json, es.json
tests/
  welcome.spec.ts            # 4 tests: welcome screen rendering
  gameplay.spec.ts           # 3 tests: name input + category select flow, game start
  e2e-solo.spec.ts           # 2 tests: full solo flow, language toggle
  multiplayer-flow.spec.ts   # 6 tests: multiplayer menu, create/join flows, validation
  multiplayer-e2e.spec.ts    # 4 tests: two-browser real Supabase flows
  session-persistence.spec.ts # 6 tests: sessionStorage, reload restore
  disconnect.spec.ts         # 3 tests: disconnect/reconnect (2 skipped)
  edge-cases.spec.ts         # 3 tests: error handling, single category, exit
```

---

## 10. Game Constants (`src/constants/game-config.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| `VICTORY_POINTS` | 150 | Points needed to win |
| `TURN_TIMER` | 180 | Seconds per turn |
| `TRIVIA_TIMER` | 60 | Seconds for trivia answer |
| `ROOM_CODE_LENGTH` | 4 | Characters in room code |
| `BOT_NAME` | `'Socrates'` | Bot opponent name |
| `BOT_ACCURACY` | 0.7 | Bot correct answer probability |
| `BOT_THINK_MIN / MAX` | 3000 / 8000 | Bot think delay range (ms) |
| `HINT_LETTER_COST` | 3 | Points cost for a letter hint |
| `TRIVIA_HINT_COST` | 5 | Points cost for a trivia hint |
| `FEEDBACK_CORRECT_DURATION` | 4000 | Correct feedback display time (ms) |
| `FEEDBACK_INCORRECT_DURATION` | 4000 | Incorrect feedback display time (ms) |
| `TURN_TIMER_THRESHOLDS` | `{ green: [120,180], yellow: [60,119], red: [0,59] }` | Turn timer color states |
| `TRIVIA_TIMER_THRESHOLDS` | `{ green: [40,60], yellow: [20,39], red: [0,19] }` | Trivia timer color states |
