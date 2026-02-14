# Crossfire Intellectual - Specification

## Description

Hybrid crossword + trivia game for 1-2 players. Complete words, answer questions, double your points. First to 150 pts wins.

- **Modes:** Solo (vs Bot) | Multiplayer (realtime with rooms)
- **Languages:** Spanish and English (selector on welcome screen)

## Tech Stack

- React 18 + TypeScript + Vite + Tailwind
- Supabase (PostgreSQL + Realtime)
- Zustand, Framer Motion, Howler.js
- i18n: react-i18next (Spanish/English)
- Testing: Playwright (MANDATORY before commits)
- Questions: Free static JSON (separate files per language)
- Deploy: Vercel

## Code Language

CRITICAL: ALL code must be written in ENGLISH. This includes variables, functions, components, comments, and file names. Only user-facing text lives in the translation files (`es.json` and `en.json`).

| Element | Example |
|---------|---------|
| Variables | `currentPlayer`, `gameState`, `questionModal` |
| Functions | `handleWordComplete()`, `validateAnswer()` |
| Components | `WelcomeScreen`, `GameBoard`, `QuestionModal` |
| Comments | `// Check if player has completed word` |
| Files | `welcome-screen.tsx`, `game-board.tsx` |

## Project Structure

Follows DRY, KISS, Clean Code principles. Layer-based with clear separation of concerns.

```
src/
  components/
    ui/                  Button, Card, Timer, Modal, Badge, Input
    screens/             WelcomeScreen, Tutorial, ConfigScreen, WaitingRoom,
                         GameBoard, QuestionModal, FeedbackOverlay, VictoryScreen
  hooks/                 useTimer, useGameState, useSound, useRoom, useCrossword
  store/                 game-store.ts (Zustand slices)
  types/                 game.types.ts
  lib/
    game-logic.ts        Scoring, turns, victory conditions
    bot.ts               Socrates AI logic
    crossword.ts         Grid operations, word validation
    networking.ts        Supabase rooms, realtime sync
    sound.ts             Howler.js wrapper
  data/
    questions/
      en.json            English question bank
      es.json            Spanish question bank
    crosswords/
      en.json            English crossword definitions
      es.json            Spanish crossword definitions
  constants/
    scrabble-values.ts   Letter point values
    game-config.ts       Timers, thresholds, victory points
  i18n/
    locales/
      en.json            English UI text
      es.json            Spanish UI text
    config.ts            i18next configuration
  utils/                 Shared helper functions
  App.tsx
  main.tsx
  index.css

tests/
  welcome.spec.ts
  onboarding.spec.ts
  room-creation.spec.ts
  gameplay.spec.ts
  timer.spec.ts
  questions.spec.ts
  i18n.spec.ts
  e2e-solo.spec.ts
  e2e-multi.spec.ts
```

## Visual Design - Glassmorphism

The UI uses a glassmorphism design system with translucent cards, gradient mesh backgrounds, and soft blur effects. CSS classes: `glass`, `glass-strong`, `bg-mesh-*`, `blob`, `btn-gradient-green`.

### Color Palette

| Name | Hex | CSS Variable |
|------|-----|-------------|
| Forest Green | `#589C48` | `--color-forest-green` |
| Terracotta | `#F58024` | `--color-terracotta` |
| Gold | `#FBB149` | `--color-gold` |
| Night Blue | `#733381` | `--color-night-blue` |
| Sage Green | `#A8C69F` | `--color-sage-green` |
| Warm Brown | `#3A3A3A` | `--color-warm-brown` |
| Crimson | `#DC143C` | `--color-crimson` |

**Color Usage:**

| Color | Purpose |
|-------|---------|
| Forest Green | Headers, primary buttons, titles, Player 1 |
| Terracotta | Accents, points badges, correct answer bonus, interactive elements |
| Gold | Victory, confetti, achievements |
| Night Blue | Player 2, trivia hint badge |
| Sage Green | Completed cells, neutral backgrounds |
| Warm Brown | Body text, borders, subtle elements |
| Crimson | Errors, incorrect answers, critical timer |

**Typography:**

| Use | Font |
|-----|------|
| Titles | Playfair Display (serif) - `font-title` |
| Body | Inter (sans-serif) - `font-body` |
| Monospaced (room codes, scores) | JetBrains Mono - `font-mono` |

### Accessibility (Mobile)

Target audience includes older users with limited eyesight. Mobile font sizes must be larger:

| Element | Mobile | Desktop |
|---------|--------|---------|
| Clue text | `text-base` (16px) | `text-xs` (12px) |
| Cell numbers | `10px` | `9px` |
| Cell letters | `text-sm` (14px) | `text-sm` (14px) |
| Section headers | `text-base` (16px) | `text-xs` (12px) |
| Grid border radius | `rounded-lg` | `rounded-lg` |

Mobile keyboard only opens on explicit cell/clue tap, never auto-focused.

## Screens

### 1. Welcome Screen

- Language selector: top-right corner (ES | EN toggle)
- Title: "CROSSFIRE INTELLECTUAL" (Playfair Display)
- Subtitle: "Competitive Crossword + Cultural Trivia"
- Two large glassmorphism cards: "PLAY VS SOCRATES" (solo, green) / "MULTIPLAYER" (terracotta)
- Each card has icon, title, and description
- Secondary ghost button: "HOW TO PLAY"
- Background: gradient mesh with animated blobs

### 2. Tutorial (MANDATORY on first use)

- NOT optional: forced on first visit (tracked via localStorage flag)
- 4 visual step cards with clear numbered instructions (written for older users):
  1. COMPLETE WORDS - Select a word, type the letters. Hint button costs 3 points.
  2. ANSWER THE QUESTION - After completing a word, answer a trivia question. Option to show 4 choices (costs 5 points).
  3. EARN POINTS - Correct answer = double points (x2). With options hint = x1.5 instead of x2.
  4. REACH 150 POINTS - Turns alternate. First to 150 points wins.
- "BACK" button returns to welcome screen
- "GOT IT - START" button to proceed

### 3. Config Screen

- Player name input (required, cannot proceed without it)
- If multiplayer: Create Room / Join Room (input 4-char code)
- 2x3 grid of clickable categories (minimum 1 must be selected)
- Selected state: thick forest green border + cream background
- "CONTINUE" button (disabled until name + at least 1 category)

### 4. Waiting Room (multiplayer only)

- Room code: 4 alphanumeric characters (e.g., K7P2), large and copiable
- "Share this code with your rival" instruction
- Player 1 card: name + "Ready" checkbox
- Player 2 card: "Waiting for player 2..." + spinner (or name + Ready if connected)
- Summary of selected categories
- "START GAME" button: only visible to room creator (Player 1), disabled until both ready
- Countdown 3... 2... 1... START! animation before first turn

### 5. Game Screen

- **Header (fixed top):** Exit button (left, confirmation dialog, opponent wins by default in multiplayer) | Logo/title (center) | Sound/volume controls (right)
- **Scoreboards (two horizontal cards):**
  - Player 1 (left): forest green background, name, large score, timer
  - Player 2 (right): night blue background, name, score, timer
  - Turn badge with pulse: shows player name in multiplayer ("Player's turn!"), "Your turn!" in solo
  - Timer format: "2:45" (green > yellow > red based on remaining time)
- **Crossword Grid (center, maximum space):**
  - 10x12 cell grid
  - Black cells: empty/blocked spaces (defined explicitly in data)
  - White cells: empty cells where the player types letters
  - Pre-filled cells: some letters already placed as hints (warm brown text)
  - Sage green cells: correctly completed letters
  - Selected word highlight: terracotta border on active word cells
  - Reveal animation: scale 0.8 to 1.0 when word is confirmed correct
  - Player clicks a cell or clue to select a word, then types letter by letter
  - Arrow keys or Tab to navigate between cells
- **Turn Indicator + Hint Button:**
  - Pill showing whose turn it is (with player name in multiplayer)
  - Letter hint button appears next to pill during typing phase (costs 3 pts)
- **Clue List (below grid, scrollable):**
  - Two columns: "ACROSS" and "DOWN"
  - Each clue shows: number + clue text
  - Available: terracotta hover + pointer cursor (clicking jumps to first cell)
  - Completed: gray + strikethrough + green checkmark
  - Font size: `text-base` (16px) on mobile for accessibility
  - No word text shown (player must figure out the word from the clue)

### 6. Question Modal

- Glassmorphism overlay card
- Animated brain icon (pulse) at top
- Title: "KNOWLEDGE QUESTION"
- Context: "Completed word: WORD" + category badge
- Points row with badges: "X base pts" (green) + "2X if correct" (terracotta)
- Question text in white/60 card
- **Two question formats based on difficulty:**
  - Easy/medium: open-ended text input (player types the answer)
  - Hard: multiple choice with 4 option buttons in 2x2 grid
- **Trivia hint (open questions only):** clickable badge "SHOW OPTIONS" in the points row (night-blue). Costs 5 points (deducted upfront). Converts to multiple choice. Multiplier becomes x1.5 instead of x2. Disabled if not enough points. Badge disappears after use.
- 1:00 circular timer
- NO close button: player must answer or wait for timeout
- Only shown to the active player (not during bot turn)

### 7. Feedback

- **Correct:** Gold checkmark icon + "CORRECT!" text + animated point counter (base to doubled) + gold confetti + success sound + auto-closes in 2 seconds
- **Incorrect:** Crimson X icon + "INCORRECT" text + "The answer was: [correct option]" + base points only + shake animation + wrong sound + auto-closes in 3 seconds

### 8. Victory Screen

- Confetti animation + 3D trophy rotation
- Winner name and final score
- Game statistics (words completed, correct answers, time played)
- Two buttons: "REMATCH" (new random crossword, same categories, scores reset to 0) + "BACK TO MENU"
- Rematch always picks a different crossword than the previous game (tracked via `lastCrosswordId`)

## Game Mechanics

### Core Gameplay Loop

This is the central flow of each turn:

1. **Turn starts** - Timer begins (3:00). Player sees the crossword grid with black cells, pre-filled hint letters, and empty white cells.
2. **Select a word** - Player clicks on a clue from the list or directly on a cell in the grid. The target word's cells are highlighted with terracotta border.
3. **Type the word** - Player types letters one by one into the highlighted cells. Arrow keys or Tab to navigate between cells.
4. **Submit** - Player presses Enter or clicks a "Submit" button.
   - **Wrong word**: cells shake briefly, player can retry or select a different word (timer keeps running).
   - **Correct word**: cells turn sage green with reveal animation. A trivia question appears (turn timer PAUSES).
5. **Answer trivia** - Question modal opens with 1:00 timer.
   - Easy/medium questions: open-ended (type the answer).
   - Hard questions: multiple choice (4 options).
   - **Correct**: word points are DOUBLED.
   - **Incorrect or timeout**: base points only.
6. **Turn ends** - Points are awarded, turn passes to the other player.

One correct word submission per turn. Unlimited retries within the timer.

### Scoring

- Letter scoring uses Scrabble values (see table below)
- Word points = sum of Scrabble values of each letter in the word
- Correct trivia answer (no hint) = DOUBLE the word points (base x 2)
- Correct trivia answer (with options hint) = base x 1.5
- Wrong trivia answer or trivia timeout = base points only
- Turn timeout (no word completed) = 0 points

### Hint System

| Hint | Cost | Effect |
|------|------|--------|
| Letter hint (crossword) | 3 points | Reveals one random unrevealed letter. Button shown next to turn indicator during typing phase. |
| Options hint (trivia) | 5 points | Converts open question to multiple choice (4 options). Reduces bonus from x2 to x1.5. Shown as badge in points row. |

Both hints are disabled when the player doesn't have enough points (e.g., first turn with 0 points).

**Scrabble Letter Values:**

| Points | Letters |
|--------|---------|
| 1 | A, E, I, O, U, L, N, S, T, R |
| 2 | D, G |
| 3 | B, C, M, P |
| 4 | F, H, V, W, Y |
| 5 | K |
| 8 | J, X, Ñ |
| 10 | Q, Z |

Ñ uses its Spanish Scrabble value (8 points). LL is not a single tile; each L scores independently.

### Turn Timer (3 minutes)

- Starts when it becomes your turn: 3:00 countdown
- Visual states: 3:00-2:00 = green | 1:59-1:00 = yellow | 0:59-0:00 = crimson + pulse
- Timeout = lose turn (0 points) + bell sound
- Turn timer PAUSES while the question modal is open
- Timer resumes if the player returns without having completed a word yet

### Trivia Timer (1 minute)

- Starts when question modal opens
- Timeout = base points only, turn passes to next player
- Circular countdown display inside the modal

### Victory Conditions

- First player to reach 150 points wins
- If crossword is fully completed: highest score wins
- Tie-breaking: sudden death questions (one or more) until one player answers correctly and the other doesn't

### Turn Order

- Multiplayer: Player 1 (room creator) always starts first
- Multiplayer start: countdown 3... 2... 1... START! animation before first turn
- Turns alternate automatically after each play

### Bot - "Socrates" (Solo Mode)

- Name: "Socrates" with robot icon
- Simulates thinking: 8-15 second delay with "Thinking..." animated dots (gives human player time to observe and plan their next move)
- Selects available words RANDOMLY
- Answers trivia with 70% accuracy
- No visible timer (plays automatically, never exceeds a normal user's response time)
- Can make mistakes (both in word attempts and trivia answers)
- Designed to be challenging but beatable

### Categories

- 6 categories: History, Language, Science, Philosophy, Art, Geography
- Minimum 1 category must be selected to start a game
- Questions displayed in the selected language
- Category selection filters TRIVIA QUESTIONS only, not crossword words. All words in the crossword are always playable regardless of selected categories. Trivia questions are drawn from the selected categories pool.

### Room System (Multiplayer)

- Room code: 4 alphanumeric characters (e.g., K7P2)
- Only room creator (Player 1) can press START
- Both players must mark "Ready" before START is enabled

### Shared Crossword (Multiplayer)

- Both players share the same crossword grid
- Once a player completes a word, it is completed for both (no longer available)
- Both players see completed words in real time (sage green cells)

### State Management

- Solo mode: all state managed locally with Zustand, no networking
- Multiplayer mode: state synchronized via Supabase Realtime

### Sound Effects

- All sound files must be <50KB each
- Volume control accessible from game header
- Required sounds:

| Sound | Trigger |
|-------|---------|
| Click | Button/cell interaction |
| Reveal | Letter appears on grid |
| Question | Modal opens |
| Correct | Right answer |
| Incorrect | Wrong answer |
| Victory | Game won |
| Turn | Turn changes |
| Timeout | Timer reaches 0 |

### Crossword Data

- Preload 5 crosswords with 15-20 words each (selected randomly per game)
- Words must cover all 6 categories
- Separate crossword data files per language (Spanish/English)
- Same crossword layouts for both languages (translated words and clues)
- Black cells: any cell NOT part of any word is automatically black (computed, not only from `blackCells` array)
- Pre-filled hint letters defined explicitly per crossword

**Crossword JSON format:**

```json
{
  "id": 1,
  "title": "Classic Knowledge",
  "grid": {
    "rows": 10,
    "cols": 12,
    "blackCells": [[0,0], [0,1], [0,5], [3,8]],
    "prefilled": [
      { "row": 2, "col": 3, "letter": "A" },
      { "row": 4, "col": 7, "letter": "R" }
    ]
  },
  "words": [
    {
      "id": 1,
      "word": "RENAISSANCE",
      "clue": "European cultural movement from the 14th century",
      "category": "history",
      "direction": "across",
      "row": 2,
      "col": 1
    }
  ]
}
```

### Question Data

- Same question set for both languages (translated versions of each question)
- Minimum 100 questions per category (600 total)
- Supplementary source: Open Trivia Database (opentdb.com) as offline reference to generate static JSON (NO runtime API calls)
- Two question types based on difficulty:
  - `open`: player types the answer (easy/medium difficulty)
  - `multiple-choice`: player picks from 4 options (hard difficulty)
- **ALL questions must have an `options` array** with 4 coherent alternatives (including the correct answer). Options must be semantically consistent: if the answer is a year, all options are years; if a composer, all are composers; if a country, all are countries, etc.
- For `open` questions, options are hidden by default but shown when the player uses the trivia hint (costs 5 pts).
- For `multiple-choice` questions, options are shown immediately.

**Open answer validation:**
- Case-insensitive comparison
- Trim whitespace
- Accent-insensitive (normalize diacritics: "Berlin" matches "Berlin")
- No fuzzy matching (answer must be exact after normalization)

**Question JSON format:**

```json
{
  "history": [
    {
      "id": "hist-001",
      "question": "In what year did the Berlin Wall fall?",
      "type": "multiple-choice",
      "answer": "1989",
      "options": ["1987", "1989", "1991", "1993"],
      "difficulty": "hard"
    },
    {
      "id": "hist-002",
      "question": "Who was the first Roman emperor?",
      "type": "open",
      "answer": "Augustus",
      "options": ["Augustus", "Julius Caesar", "Nero", "Tiberius"],
      "difficulty": "medium"
    }
  ],
  "language": [],
  "science": [],
  "philosophy": [],
  "art": [],
  "geography": []
}
```

## Internationalization (i18n)

### File Structure

```
src/i18n/
  locales/
    es.json  (Spanish text)
    en.json  (English text)
  config.ts  (i18next configuration)
```

### Language Selector

- Location: Top-right corner of welcome screen
- Design: Clickable flags (ES | EN) or dropdown
- Animation: Smooth transition on language change
- Visual indicator for active language
- Persistence: localStorage to remember preference
- Default: Detect browser language, fallback to Spanish

### Locale File Examples

**es.json (excerpt):**

```json
{
  "welcome": {
    "title": "CROSSFIRE INTELECTUAL",
    "playSolo": "JUGAR CONTRA SÓCRATES",
    "playMulti": "MULTIJUGADOR",
    "tutorial": "CÓMO JUGAR"
  },
  "game": {
    "yourTurn": "TU TURNO",
    "playerTurnHint": "¡Turno de {{name}}! Elige una palabra",
    "hint": "PISTA",
    "hintCost": "-{{cost}} pts"
  },
  "question": {
    "requestOptions": "PEDIR OPCIONES",
    "requestOptionsCost": "(x0.5 pts)"
  }
}
```

**en.json (excerpt):**

```json
{
  "welcome": {
    "title": "CROSSFIRE INTELLECTUAL",
    "playSolo": "PLAY VS SOCRATES",
    "playMulti": "MULTIPLAYER",
    "tutorial": "HOW TO PLAY"
  },
  "game": {
    "yourTurn": "YOUR TURN",
    "playerTurnHint": "{{name}}'s turn! Pick a word",
    "hint": "HINT",
    "hintCost": "-{{cost}} pts"
  },
  "question": {
    "requestOptions": "SHOW OPTIONS",
    "requestOptionsCost": "(x0.5 pts)"
  }
}
```

### Usage in Components

```tsx
import { useTranslation } from 'react-i18next';

function WelcomeScreen() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('welcome.title')}</h1>
      <p>{t('welcome.subtitle')}</p>
      <button>{t('welcome.playSolo')}</button>
    </div>
  );
}
```

## Git Methodology

### Branches

`main` (stable) | `develop` (active) | `feature/[name]` | `fix/[name]`

### Conventional Commits (in ENGLISH)

```
feat: new feature
fix: bug fix
refactor: code refactoring
style: CSS styles
docs: documentation
test: tests
chore: maintenance
```

### Rules

- NO "Co-authored-by"
- Atomic commits in ENGLISH
- Max 72 characters
- Test BEFORE committing
- Format: `type: description in english`

### Workflow Example

```bash
git checkout -b feature/i18n-setup
# ... make changes IN ENGLISH ...
npm test  # All tests pass
git commit -m "feat: add i18n support with es and en locales"
git checkout develop && git merge feature/i18n-setup
```

## Testing with Playwright (MANDATORY)

### Setup

```bash
npm install -D @playwright/test
npx playwright install
```

### Required Test Files

```
tests/
  welcome.spec.ts        (welcome screen + language)
  onboarding.spec.ts     (tutorial)
  room-creation.spec.ts  (room create/join)
  gameplay.spec.ts       (game mechanics)
  timer.spec.ts          (timer system)
  questions.spec.ts      (question system)
  i18n.spec.ts           (language switching)
  e2e-solo.spec.ts       (full solo flow)
  e2e-multi.spec.ts      (full multiplayer flow)
```

### Test Example

```ts
import { test, expect } from '@playwright/test';

test.describe('Welcome Screen', () => {
  test('should display solo and multiplayer buttons', async ({ page }) => {
    await page.goto('/');

    const soloButton = page.getByRole('button', { name: /jugar solo|play solo/i });
    const multiButton = page.getByRole('button', { name: /multijugador|multiplayer/i });

    await expect(soloButton).toBeVisible();
    await expect(multiButton).toBeVisible();
  });

  test('should change language when clicking selector', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="lang-en"]');
    await expect(page.getByText('PLAY SOLO')).toBeVisible();
  });
});
```

### Mandatory Test Workflow

1. Make changes (code in English)
2. Run related tests: `npm run test:related`
3. If pass, run full suite: `npm test`
4. If all pass, commit
5. If any test fails, fix and repeat
6. NEVER commit without testing

### Package.json Scripts

```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:related": "playwright test --grep",
    "test:watch": "playwright test --watch",
    "test:report": "playwright show-report"
  }
}
```

### Minimum Coverage

- Critical flows: 100% (create room, play turn, answer question)
- UI components: 80%
- Utility functions: 90%
- Edge cases: All covered (timeout, disconnection, etc.)

## Phased Development

STRATEGY: Incremental development by phases. Each phase validates the previous one before advancing. Claude Code executes all work sequentially, using parallel subagents only when tasks are fully independent and touch different files.

### When to use parallel subagents

Subagents (Task tool) can run in parallel ONLY when:
- They write to completely different files (zero overlap)
- They don't depend on each other's output
- The result is deterministic (e.g., generating data, not designing architecture)

Good candidates for parallelism:
- Generating question bank JSON while building unrelated UI components
- Creating crossword data files while writing game logic functions
- Writing test files while the main code is already stable

NOT parallel: anything that touches shared files (store, types, App.tsx, routing).

### Phase 1 - Foundation ✅ COMPLETED

Branch: `feature/setup`

1. ✅ Create `ARCHITECTURE.md` with all contracts
2. ✅ Set up project (Vite + React + TypeScript + Tailwind)
3. ✅ Create full folder structure (see Project Structure)
4. ✅ Implement global TypeScript types (see Architecture Contract)
5. ✅ Configure Zustand store
6. ✅ Set up i18n (`es.json`, `en.json`, config)
7. ✅ Define Scrabble letter value constants
8. Commit: `feat: define architecture, types, store and i18n`

**All tests pass. Build compiles without errors.**

### Phase 2 - UI Screens + Game Logic

Branch: `feature/phase2-ui-and-logic`

**Implemented:**
1. ✅ All screen components: WelcomeScreen, Tutorial, ConfigScreen, WaitingRoom, GameScreen, QuestionModal, FeedbackOverlay, VictoryScreen
2. ✅ Glassmorphism design system with Tailwind v4 + Framer Motion transitions
3. ✅ Game logic: scoring (with hint multipliers), word validation, turn management, victory conditions
4. ✅ Bot "Socrates" AI: random word selection, 70% accuracy, 8-15s thinking delay
5. ✅ Timer system: 3min turn (pauses during trivia) + 1min trivia
6. ✅ Zustand store with turnPhase state machine
7. ✅ Hint system: letter hints (-3 pts) + trivia options hint (-5 pts, x1.5 multiplier)
8. ✅ UI component library: Button, Card, Input, Modal, Badge, TimerDisplay, LanguageSelector, Confetti
9. ✅ Crossword + question data files (5 crosswords, 600+ questions per language)
10. ✅ Hooks: useTimer, useSound, useCrossword, useGameState
11. ✅ Mobile accessibility: larger fonts, touch-friendly targets, keyboard management
12. ✅ Solo mode fully playable end-to-end

**Pending:**
- [ ] Add `options` array to ALL questions in JSON (coherent alternatives). Currently `open` questions generate options at runtime which produces incoherent distractors. Each question must have 4 pre-defined options in the JSON.
- [ ] Update `data-loader.ts` to use JSON options instead of `generateOptionsForQuestion()`
- [ ] Update `Question` type to make `options` required (not optional)

**Run full test suite. Solo mode must work end-to-end before continuing.**

### Phase 3 - Networking

Branch: `feature/networking`

1. Set up Supabase tables (rooms, games, crosswords)
2. Implement room creation/joining with 4-char codes
3. Implement realtime game state synchronization
4. Handle disconnections and reconnection
5. Adapt existing solo logic to support multiplayer state sync
6. Commit: `feat: add supabase realtime multiplayer`

**Run tests before merging to develop.**

### Phase 4 - Polish

Branch: `feature/polish`

1. Add animations: victory confetti, error shake, reveal animation, countdown
2. Add sounds via Howler.js (all 8 sound effects)
3. Complete e2e tests for both solo and multiplayer flows
4. Performance optimization and responsive polish
5. Commit: `feat: add animations, sounds and e2e tests`

**Run full test suite. All tests must pass.**

## Architecture Contract

BEFORE starting development (Phase 1), create `ARCHITECTURE.md` containing:

### Global TypeScript Interfaces

```ts
// types/game.types.ts
export type Category = 'history' | 'language' | 'science' | 'philosophy' | 'art' | 'geography';
export type QuestionType = 'open' | 'multiple-choice';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Direction = 'across' | 'down';
export type GameStatus = 'waiting' | 'playing' | 'finished';

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
  options?: [string, string, string, string]; // only for multiple-choice
  category: Category;
  difficulty: Difficulty;
}
```

### Expected Function Signatures

```ts
// Game Logic Layer
export function validateWord(wordId: number, input: string): boolean;
export function completeWord(wordId: number, playerId: string): void;
export function validateAnswer(question: Question, answer: string): boolean;
export function calculateScore(word: string, isCorrect: boolean): number;
export function switchTurn(): void;
export function checkVictoryCondition(): 'playing' | 'victory' | 'tie';

// Bot Logic
export function botSelectWord(availableWords: Word[]): Word;
export function botAnswerQuestion(question: Question): { answer: string; isCorrect: boolean };

// Networking Layer
export function createRoom(categories: Category[]): Promise<string>;
export function joinRoom(code: string): Promise<void>;
export function syncGameState(state: GameState): Promise<void>;
export function onStateUpdate(callback: (state: GameState) => void): void;

// Data Layer
export function getQuestion(category: Category, language: 'es' | 'en'): Question;
export function getCrossword(id: number, language: 'es' | 'en'): Crossword;
export function getScrabbleValue(letter: string): number;
```

### Supabase Database Schema (Multiplayer)

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(4) UNIQUE NOT NULL,
  mode VARCHAR(10) CHECK (mode IN ('solo', 'multiplayer')),
  categories JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE games (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  player1_name VARCHAR(100) NOT NULL,
  player1_score INT DEFAULT 0,
  player1_ready BOOLEAN DEFAULT false,
  player2_name VARCHAR(100),
  player2_score INT DEFAULT 0,
  player2_ready BOOLEAN DEFAULT false,
  current_turn INT DEFAULT 1,
  completed_words JSONB DEFAULT '[]',
  crossword_id INT NOT NULL,
  winner_id UUID,
  started_at TIMESTAMP,
  finished_at TIMESTAMP
);

CREATE TABLE crosswords (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  difficulty VARCHAR(20),
  words JSONB NOT NULL
);
```

### Naming Conventions (STRICT)

| Element | Convention | Examples |
|---------|-----------|----------|
| Variables | camelCase | `currentPlayer`, `gameState`, `wordList` |
| Functions | camelCase + verb | `handleWordClick()`, `validateInput()` |
| Components | PascalCase | `WelcomeScreen`, `GameBoard`, `QuestionModal` |
| Constants | UPPER_SNAKE_CASE | `MAX_TIMER`, `VICTORY_POINTS` |
| Types/Interfaces | PascalCase | `GameState`, `Player`, `Question` |
| Files | kebab-case | `game-board.tsx`, `question-modal.tsx` |
| Custom hooks | use + PascalCase | `useGameState()`, `useTimer()` |
| Event handlers | handle + Event | `handleClick`, `handleSubmit` |
| Boolean flags | is/has/should + Adj | `isReady`, `hasCompleted` |
| Folders | kebab-case | `components/`, `game-logic/`, `networking/` |

## Integration Test Example

```ts
// tests/integration/full-flow.spec.ts
test('complete game flow with all modules', async ({ page }) => {
  // Navigate to welcome screen
  await page.goto('/');
  await page.click('[data-testid="play-solo"]');

  // Config: enter name and select category
  await page.fill('[name="playerName"]', 'TestPlayer');
  await page.click('[data-testid="category-history"]');
  await page.click('[data-testid="start-game"]');

  // Game: click on a clue to select a word
  await page.click('[data-testid="clue-across-1"]');

  // Type the word into the grid cells
  await page.keyboard.type('RENAISSANCE');
  await page.keyboard.press('Enter');

  // Verify trivia question appeared
  const question = page.locator('[data-testid="question-text"]');
  await expect(question).toBeVisible();

  // Answer the trivia question
  await page.click('[data-testid="option-0"]');

  // Verify score updated
  const score = page.locator('[data-testid="player-score"]');
  await expect(score).not.toHaveText('0');
});
```

## Final Checklist

- [ ] All modules compile without TypeScript errors
- [ ] Imports between modules work correctly
- [ ] Unit tests per module pass (100%)
- [ ] Integration tests between modules pass (100%)
- [ ] End-to-end tests for full flow pass
- [ ] No naming/variable conflicts
- [ ] All `ARCHITECTURE.md` contracts are fulfilled
- [ ] Production build works: `npm run build`
- [ ] App starts without errors: `npm run dev`
- [ ] All features work in browser
- [ ] Language switching works across the entire app
- [ ] Solo mode works completely
- [ ] Multiplayer mode works completely
- [ ] No console.errors or warnings

GOLDEN RULE: If the full checklist does not pass, it is NOT done.

## Critical Requirements Summary

- Responsive mobile-first
- Strict TypeScript
- ALL code in ENGLISH (variables, functions, comments)
- UI text only in `es.json` and `en.json`
- Functional language selector
- NO Claude API (free static JSON only)
- Exact "Modern Library" color palette
- Playwright tests BEFORE every commit
- Conventional commits in ENGLISH, NO co-author
- Phased development (sequential, parallel subagents only for independent file work)
