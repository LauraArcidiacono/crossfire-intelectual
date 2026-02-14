import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { useCrossword } from '../../hooks/use-crossword';
import { useGameState } from '../../hooks/use-game-state';
import { useTimer } from '../../hooks/use-timer';
import { useSound } from '../../hooks/use-sound';
import { Button } from '../ui/button';
import { TimerDisplay } from '../ui/timer-display';
import { Modal } from '../ui/modal';
import { QuestionModal } from './question-modal';
import { FeedbackOverlay } from './feedback-overlay';
import {
  cellKey,
  getHintCell,
  getPrefilledLetter,
  getRevealedLetter,
  getWordCells,
  getWordNumberAtCell,
} from '../../lib/crossword';
import { TURN_TIMER, HINT_LETTER_COST } from '../../constants/game-config';

export function GameScreen() {
  const { t } = useTranslation();
  const store = useGameStore();
  const crosswordHook = useCrossword();
  const gameState = useGameState();
  const { play } = useSound();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [wrongWordShake, setWrongWordShake] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const turnTimer = useTimer({
    initialTime: TURN_TIMER,
    autoStart: true,
    onExpire: gameState.handleTurnTimeout,
  });

  useEffect(() => {
    if (store.turnPhase === 'question' || store.turnPhase === 'feedback') {
      turnTimer.pause();
    } else if (store.turnPhase === 'selecting' || store.turnPhase === 'typing') {
      turnTimer.reset();
      turnTimer.start();
    }
  }, [store.turnPhase, store.currentTurn]);

  useEffect(() => {
    gameState.syncTurnTimer(turnTimer.timeRemaining);
  }, [turnTimer.timeRemaining]);

  const focusInput = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  // Only auto-focus on desktop (keyboard won't cover the screen)
  // On mobile/touch devices, only focus when user explicitly taps a cell or clue
  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice && !gameState.isBotTurn && store.turnPhase !== 'question' && store.turnPhase !== 'feedback') {
      focusInput();
    }
  }, [store.turnPhase, gameState.isBotTurn, store.selectedWordId, focusInput]);

  const handleMobileInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const value = (e.target as HTMLInputElement).value;
      if (value.length > 0) {
        const lastChar = value[value.length - 1];
        if (/^[a-zA-ZñÑ]$/.test(lastChar)) {
          const syntheticEvent = { key: lastChar, preventDefault: () => {} } as React.KeyboardEvent;
          crosswordHook.handleKeyDown(syntheticEvent);
        }
      }
      // Always clear the hidden input
      (e.target as HTMLInputElement).value = '';
    },
    [crosswordHook]
  );

  const handleSubmitWord = useCallback(() => {
    const result = crosswordHook.handleSubmitWord();
    if (!result) return;

    if (result.isValid) {
      play('reveal');
      gameState.handleWordSubmitted(result.word, true);
    } else {
      play('incorrect');
      setWrongWordShake(true);
      setTimeout(() => {
        setWrongWordShake(false);
        if (store.crossword && crosswordHook.selectedWord) {
          const cells = getWordCells(crosswordHook.selectedWord);
          cells.forEach((c) => {
            const prefilled = getPrefilledLetter(store.crossword!.grid, c.row, c.col);
            if (!prefilled) {
              store.setCellInput(cellKey(c.row, c.col), '');
            }
          });
        }
      }, 600);
    }
  }, [crosswordHook, gameState, play, store]);

  const handleHint = useCallback(() => {
    if (!store.crossword || !crosswordHook.selectedWord) return;
    if (store.players[gameState.currentPlayerIndex].score < HINT_LETTER_COST) return;
    const hint = getHintCell(crosswordHook.selectedWord, store.cellInputs, store.crossword.grid);
    if (!hint) return;
    store.setCellInput(cellKey(hint.row, hint.col), hint.letter);
    store.updateScore(gameState.currentPlayerIndex, -HINT_LETTER_COST);
    play('click');
  }, [store, crosswordHook.selectedWord, gameState.currentPlayerIndex, play]);

  const handleAnswerSubmitted = useCallback(
    (answer: string, usedHint = false) => {
      gameState.handleAnswerSubmitted(answer, usedHint);
    },
    [gameState]
  );

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (gameState.isBotTurn) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (crosswordHook.isCurrentWordFilled && store.turnPhase === 'typing') {
          handleSubmitWord();
        }
        return;
      }
      crosswordHook.handleKeyDown(e);
    },
    [crosswordHook, gameState.isBotTurn, handleSubmitWord, store.turnPhase]
  );

  const handleExit = () => {
    store.resetGame();
    store.setScreen('welcome');
  };

  if (!store.crossword) return null;

  const grid = store.crossword.grid;
  const directions = (['across', 'down'] as const).filter(
    (dir) => store.crossword!.words.some((w) => w.direction === dir)
  );

  const getTurnText = () => {
    if (gameState.isBotTurn) {
      if (gameState.isBotThinking) return t('game.botTurnThinking');
      return t('game.opponentTurn');
    }
    const currentPlayer = store.players[gameState.currentPlayerIndex];
    if (store.mode === 'multiplayer') {
      return t('game.playerTurnHint', { name: currentPlayer.name });
    }
    return t('game.yourTurnHint');
  };

  return (
    <div data-testid="game-screen" className="min-h-screen bg-mesh-game relative overflow-hidden flex flex-col">
      {/* Subtle background blobs */}
      <div className="blob blob-green w-80 h-80 -top-32 -right-32 opacity-20" style={{ animationDelay: '-5s' }} />
      <div className="blob blob-purple w-64 h-64 bottom-20 -left-32 opacity-20" style={{ animationDelay: '-12s' }} />

      {/* Header */}
      <header className="glass-strong flex items-center justify-between px-3 py-2 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => setShowExitConfirm(true)}>
          {t('game.exit')}
        </Button>
        <h1 className="font-title text-sm sm:text-base font-bold text-forest-green truncate mx-2">
          {store.crossword.title}
        </h1>
        <button
          onClick={() => store.setSoundEnabled(!store.soundEnabled)}
          className="text-warm-brown/80 hover:text-warm-brown cursor-pointer text-lg"
        >
          {store.soundEnabled ? '🔊' : '🔇'}
        </button>
      </header>

      {/* Scoreboard */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 px-3 py-2 relative z-10">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-center">
          {store.players.map((player, idx) => {
            const isCurrentPlayer = gameState.currentPlayerIndex === idx;
            const colorClass = idx === 0 ? 'forest-green' : 'night-blue';
            return (
              <motion.div
                key={player.id}
                animate={isCurrentPlayer ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-2xl flex-1 sm:flex-initial max-w-52
                  ${isCurrentPlayer
                    ? `glass-strong shadow-lg shadow-${colorClass}/20 ring-2 ring-${colorClass}/50`
                    : 'glass'
                  }
                `}
              >
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate text-${colorClass}`}>
                    {player.name}
                  </p>
                  <p className={`font-mono text-xl sm:text-2xl font-extrabold text-${colorClass}`}>
                    {player.score}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
        <TimerDisplay seconds={turnTimer.timeRemaining} variant="linear" size="sm" />
      </div>

      {/* Turn indicator pill + hint button */}
      <div className="flex items-center justify-center gap-3 px-3 py-1.5 relative z-10">
        <motion.div
          animate={!gameState.isBotTurn ? { boxShadow: ['0 0 10px rgba(88,156,72,0.2)', '0 0 20px rgba(88,156,72,0.4)', '0 0 10px rgba(88,156,72,0.2)'] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`
            inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold
            ${gameState.isBotTurn
              ? 'bg-night-blue/15 text-night-blue border border-night-blue/20'
              : 'bg-forest-green/15 text-forest-green border border-forest-green/20'
            }
          `}
        >
          <span className={`w-2 h-2 rounded-full ${gameState.isBotTurn ? 'bg-night-blue' : 'bg-forest-green'} ${gameState.isBotThinking ? 'animate-pulse' : ''}`} />
          {getTurnText()}
        </motion.div>
        {!gameState.isBotTurn && store.turnPhase === 'typing' && crosswordHook.selectedWord && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleHint}
            disabled={store.players[gameState.currentPlayerIndex].score < HINT_LETTER_COST}
            className={`
              px-3 py-1.5 rounded-full text-xs font-bold transition-all
              ${store.players[gameState.currentPlayerIndex].score >= HINT_LETTER_COST
                ? 'bg-white/50 backdrop-blur-sm text-warm-brown border border-warm-brown/20 hover:bg-white/70 cursor-pointer'
                : 'bg-warm-brown/10 text-warm-brown/30 border border-warm-brown/10 cursor-not-allowed'
              }
            `}
          >
            {t('game.hint')} ({t('game.hintCost', { cost: HINT_LETTER_COST })})
          </motion.button>
        )}
      </div>

      {/* Bot question display */}
      <AnimatePresence>
        {gameState.isBotThinking && gameState.botQuestionDisplay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 relative z-10"
          >
            <div className="max-w-lg mx-auto glass rounded-2xl p-4">
              <p className="text-xs text-night-blue font-semibold mb-1">{t('game.botQuestion')}</p>
              <p className="text-sm text-warm-brown font-medium mb-2">
                {gameState.botQuestionDisplay.question}
              </p>
              {gameState.botQuestionDisplay.answer && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs">
                  <span className="text-night-blue/80">{t('game.botAnswered')}: </span>
                  <strong className={gameState.botQuestionDisplay.isCorrect ? 'text-forest-green' : 'text-crimson'}>
                    {gameState.botQuestionDisplay.answer}
                    {gameState.botQuestionDisplay.isCorrect ? ' ✓' : ' ✗'}
                  </strong>
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-auto max-w-4xl mx-auto w-full relative z-10">
        {/* Crossword Grid */}
        <div className="flex-1 flex flex-col items-center">
          {store.turnPhase === 'selecting' && !gameState.isBotTurn && (
            <p className="text-base sm:text-xs text-warm-brown/70 mb-2 font-medium">{t('game.selectWord')}</p>
          )}

          {/* Hidden input for mobile keyboard */}
          <input
            ref={hiddenInputRef}
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onInput={handleMobileInput}
            onKeyDown={handleGridKeyDown}
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            aria-hidden="true"
          />

          <div
            ref={gridRef}
            onClick={focusInput}
            className={`inline-grid gap-[1px] bg-warm-brown/15 rounded-lg overflow-hidden shadow-lg shadow-black/5 outline-none transition-opacity duration-300 ${
              wrongWordShake ? 'animate-[shake_0.5s_ease-in-out]' : ''
            } ${gameState.isBotTurn ? 'opacity-60 pointer-events-none' : ''}`}
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: grid.rows }, (_, row) =>
              Array.from({ length: grid.cols }, (_, col) => {
                const state = crosswordHook.getCellState(row, col);
                const key = cellKey(row, col);
                const wordNum = getWordNumberAtCell(store.crossword!, row, col);
                const prefilled = getPrefilledLetter(grid, row, col);
                const input = store.cellInputs[key];

                let displayLetter = '';
                if (state === 'completed') {
                  const completedWord = store.crossword!.words.find((w) => {
                    if (!store.completedWords.includes(w.id)) return false;
                    return getWordCells(w).some((c) => c.row === row && c.col === col);
                  });
                  if (completedWord) {
                    displayLetter = getRevealedLetter(completedWord, row, col) || '';
                  }
                } else if (prefilled) {
                  displayLetter = prefilled;
                } else if (input) {
                  displayLetter = input;
                }

                const isSelected = store.selectedCell?.row === row && store.selectedCell?.col === col;

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (!gameState.isBotTurn) {
                        crosswordHook.handleCellClick(row, col);
                        focusInput();
                      }
                    }}
                    className={`
                      relative w-8 h-8 sm:w-8 sm:h-8 md:w-9 md:h-9 flex items-center justify-center
                      text-sm sm:text-sm font-mono font-bold transition-all duration-150 select-none
                      ${state === 'black' ? 'bg-warm-brown/80' : ''}
                      ${state === 'empty' ? 'bg-white/80 cursor-pointer hover:bg-white' : ''}
                      ${state === 'prefilled' ? 'bg-sage-green/10 text-forest-green' : ''}
                      ${state === 'input' ? 'bg-white text-forest-green' : ''}
                      ${state === 'selected' ? 'bg-gold/15 text-warm-brown cursor-pointer' : ''}
                      ${state === 'completed' ? 'bg-forest-green/10 text-forest-green' : ''}
                      ${isSelected ? 'ring-2 ring-terracotta ring-inset shadow-inner shadow-terracotta/20' : ''}
                    `}
                  >
                    {wordNum && (
                      <span className="absolute top-0 left-0.5 text-[10px] sm:text-[9px] text-warm-brown/60 leading-none font-bold">
                        {wordNum}
                      </span>
                    )}
                    {state !== 'black' && displayLetter}
                  </div>
                );
              })
            )}
          </div>

          {/* Submit button */}
          {crosswordHook.isCurrentWordFilled && !gameState.isBotTurn && store.turnPhase === 'typing' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Button onClick={handleSubmitWord} data-testid="submit-word">
                {t('game.submit')} ↵
              </Button>
            </motion.div>
          )}
        </div>

        {/* Clue Lists */}
        <div className="w-full lg:w-64 space-y-3">
          {directions.map((dir) => (
            <div key={dir} className="glass rounded-2xl p-3">
              <h3 className="font-title text-base sm:text-xs font-bold text-forest-green mb-2 uppercase tracking-wider">
                {t(`game.${dir}`)}
              </h3>
              <ul className="space-y-1 sm:space-y-0.5">
                {store.crossword!.words
                  .filter((w) => w.direction === dir)
                  .sort((a, b) => a.id - b.id)
                  .map((word) => {
                    const isCompleted = store.completedWords.includes(word.id);
                    const isActive = store.selectedWordId === word.id;

                    return (
                      <li
                        key={word.id}
                        onClick={() => {
                          if (!gameState.isBotTurn) {
                            crosswordHook.handleClueClick(word.id);
                            focusInput();
                          }
                        }}
                        className={`
                          text-base sm:text-xs px-3 py-2.5 sm:px-2.5 sm:py-1.5 rounded-lg cursor-pointer transition-all leading-snug
                          ${isCompleted ? 'line-through text-warm-brown/50' : 'text-warm-brown hover:bg-white/40'}
                          ${isActive ? 'bg-terracotta/10 font-semibold text-warm-brown ring-1 ring-terracotta/20' : ''}
                        `}
                      >
                        <span className="font-mono mr-1.5 text-warm-brown/60">{word.id}.</span>
                        {word.clue}
                        {isCompleted && ' ✓'}
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Question Modal - only show for the active player, not during bot turns */}
      {!gameState.isBotTurn && store.turnPhase === 'question' && store.currentQuestion && crosswordHook.selectedWord && (
        <QuestionModal
          question={store.currentQuestion}
          word={crosswordHook.selectedWord}
          onAnswer={handleAnswerSubmitted}
          onTimeout={gameState.handleTriviaTimeout}
        />
      )}

      {/* Feedback Overlay */}
      <AnimatePresence>
        {store.turnPhase === 'feedback' && store.lastFeedback && (
          <FeedbackOverlay feedback={store.lastFeedback} />
        )}
      </AnimatePresence>

      {/* Exit Confirmation */}
      <Modal isOpen={showExitConfirm} onClose={() => setShowExitConfirm(false)}>
        <div className="glass-strong rounded-3xl p-6 text-center">
          <p className="text-warm-brown mb-4 font-medium">
            {store.mode === 'solo' ? t('game.exitConfirmSolo') : t('game.exitConfirm')}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="ghost" onClick={() => setShowExitConfirm(false)}>
              {t('game.no')}
            </Button>
            <Button variant="danger" onClick={handleExit}>
              {t('game.yes')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
