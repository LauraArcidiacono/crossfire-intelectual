import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { useCrossword } from '../../hooks/use-crossword';
import { useGameState } from '../../hooks/use-game-state';
import { useTimer } from '../../hooks/use-timer';
import { useSound } from '../../hooks/use-sound';
import { useHaptics } from '../../hooks/use-haptics';
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
  const { vibrate } = useHaptics();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [wrongWordShake, setWrongWordShake] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const isOnline = gameState.online.isOnline;
  const isGuest = gameState.online.isGuest;
  const notMyTurn = !gameState.isMyTurn;

  const handleTurnTimeoutWithSound = useCallback(() => {
    play('timeout');
    gameState.handleTurnTimeout();
  }, [play, gameState]);

  const turnTimer = useTimer({
    initialTime: TURN_TIMER,
    autoStart: true,
    onExpire: handleTurnTimeoutWithSound,
  });

  // Pause/resume timer and play phase-specific sounds
  const prevTurnPhaseRef = useRef(store.turnPhase);
  const prevTurnRef = useRef(store.currentTurn);

  useEffect(() => {
    const prevPhase = prevTurnPhaseRef.current;
    const prevTurn = prevTurnRef.current;
    prevTurnPhaseRef.current = store.turnPhase;
    prevTurnRef.current = store.currentTurn;

    if (store.turnPhase === 'question' || store.turnPhase === 'feedback') {
      turnTimer.pause();
    } else if (store.turnPhase === 'selecting' || store.turnPhase === 'typing') {
      turnTimer.reset();
      turnTimer.start();
    }

    if (store.turnPhase === 'question' && prevPhase !== 'question') {
      play('question');
    }

    if (store.turnPhase === 'selecting' && prevTurn !== store.currentTurn) {
      play('turn');
    }
  }, [store.turnPhase, store.currentTurn]);

  useEffect(() => {
    if (store.turnPhase === 'feedback' && store.lastFeedback) {
      play(store.lastFeedback.isCorrect ? 'correct' : 'incorrect');
    }
  }, [store.turnPhase, store.lastFeedback]);

  useEffect(() => {
    gameState.syncTurnTimer(turnTimer.timeRemaining);
  }, [turnTimer.timeRemaining]);

  // Show disconnect modal
  useEffect(() => {
    if (gameState.online.opponentDisconnected) {
      setShowDisconnect(true);
    }
  }, [gameState.online.opponentDisconnected]);

  // Sentinel keeps the input non-empty so Android fires the input event on backspace
  const SENTINEL = '\u200B';

  const focusInput = useCallback(() => {
    if (hiddenInputRef.current) {
      hiddenInputRef.current.focus();
      hiddenInputRef.current.value = SENTINEL;
    }
  }, []);

  // Blur hidden input when entering question/feedback to dismiss mobile keyboard
  useEffect(() => {
    if (store.turnPhase === 'question' || store.turnPhase === 'feedback') {
      hiddenInputRef.current?.blur();
    }
  }, [store.turnPhase]);

  useEffect(() => {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice && !gameState.isBotTurn && !notMyTurn && store.turnPhase !== 'question' && store.turnPhase !== 'feedback') {
      focusInput();
    }
  }, [store.turnPhase, gameState.isBotTurn, notMyTurn, store.selectedWordId, focusInput]);

  const handleMobileInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const target = e.target as HTMLInputElement;
      const value = target.value;

      // Android backspace: sentinel was deleted, value no longer contains it
      if (!value.includes(SENTINEL)) {
        const syntheticEvent = { key: 'Backspace', preventDefault: () => {} } as React.KeyboardEvent;
        crosswordHook.handleKeyDown(syntheticEvent);
        target.value = SENTINEL;
        return;
      }

      // Extract typed character (strip sentinel)
      const newText = value.replace(SENTINEL, '');
      if (newText.length > 0) {
        const lastChar = newText[newText.length - 1];
        if (/^[a-zA-ZñÑ]$/.test(lastChar)) {
          if (isGuest) {
            // Guest sends cell input to host
            const selectedWord = crosswordHook.selectedWord;
            if (selectedWord && store.selectedCell) {
              gameState.handleGuestCellInput(
                cellKey(store.selectedCell.row, store.selectedCell.col),
                lastChar.toUpperCase()
              );
            }
          }
          const syntheticEvent = { key: lastChar, preventDefault: () => {} } as React.KeyboardEvent;
          crosswordHook.handleKeyDown(syntheticEvent);
        }
      }

      target.value = SENTINEL;
    },
    [crosswordHook, isGuest, gameState, store.selectedCell]
  );

  const handleSubmitWord = useCallback(() => {
    const result = crosswordHook.handleSubmitWord();
    if (!result) return;

    if (result.isValid) {
      play('reveal');
      vibrate('tap');
      gameState.handleWordSubmitted(result.word, true);
    } else {
      play('incorrect');
      vibrate('error');
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
  }, [crosswordHook, gameState, play, vibrate, store]);

  const handleHint = useCallback(() => {
    if (!store.crossword || !crosswordHook.selectedWord) return;
    if (store.players[gameState.currentPlayerIndex].score < HINT_LETTER_COST) return;

    if (isGuest) {
      gameState.handleGuestHint();
      return;
    }

    const hint = getHintCell(crosswordHook.selectedWord, store.cellInputs, store.crossword.grid);
    if (!hint) return;
    store.setCellInput(cellKey(hint.row, hint.col), hint.letter);
    store.updateScore(gameState.currentPlayerIndex, -HINT_LETTER_COST);
    play('reveal');
  }, [store, crosswordHook.selectedWord, gameState, play, isGuest]);

  const handleAnswerSubmitted = useCallback(
    (answer: string, usedHint = false) => {
      gameState.handleAnswerSubmitted(answer, usedHint);
    },
    [gameState]
  );

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (gameState.isBotTurn || notMyTurn) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (crosswordHook.isCurrentWordFilled && store.turnPhase === 'typing') {
          handleSubmitWord();
        }
        return;
      }

      // Guest sends cell inputs to host
      if (isGuest && /^[a-zA-ZñÑ]$/.test(e.key) && store.selectedCell) {
        gameState.handleGuestCellInput(
          cellKey(store.selectedCell.row, store.selectedCell.col),
          e.key.toUpperCase()
        );
      }

      crosswordHook.handleKeyDown(e);
    },
    [crosswordHook, gameState, notMyTurn, handleSubmitWord, store.turnPhase, isGuest, store.selectedCell]
  );

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameState.isBotTurn || notMyTurn) return;

      if (isGuest) {
        // Check if clicking a word cell — derive the wordId
        const word = store.crossword?.words.find((w) => {
          const cells = getWordCells(w);
          return cells.some((c) => c.row === row && c.col === col);
        });
        if (word && store.turnPhase === 'selecting') {
          gameState.handleGuestSelectWord(word.id);
        }
      }

      crosswordHook.handleCellClick(row, col);
      focusInput();
    },
    [gameState, notMyTurn, isGuest, store.crossword, store.turnPhase, crosswordHook, focusInput]
  );

  const handleClueClick = useCallback(
    (wordId: number) => {
      if (gameState.isBotTurn || notMyTurn) return;

      if (isGuest && store.turnPhase === 'selecting') {
        gameState.handleGuestSelectWord(wordId);
      }

      crosswordHook.handleClueClick(wordId);
      focusInput();
    },
    [gameState, notMyTurn, isGuest, store.turnPhase, crosswordHook, focusInput]
  );

  const handleExit = async () => {
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
    if (isOnline) {
      if (gameState.isMyTurn) {
        return t('game.yourTurnHint');
      }
      return t('game.opponentTurnHint');
    }
    const currentPlayer = store.players[gameState.currentPlayerIndex];
    if (store.mode === 'multiplayer') {
      return t('game.playerTurnHint', { name: currentPlayer.name });
    }
    return t('game.yourTurnHint');
  };

  return (
    <div data-testid="game-screen" className="min-h-screen bg-mesh-game relative overflow-hidden flex flex-col">
      <div className="blob blob-green w-80 h-80 -top-32 -right-32 opacity-20" style={{ animationDelay: '-5s' }} />
      <div className="blob blob-purple w-64 h-64 bottom-20 -left-32 opacity-20" style={{ animationDelay: '-12s' }} />

      {/* Header */}
      <header className="glass-strong flex items-center justify-between px-3 py-2 relative z-10">
        <Button variant="ghost" size="sm" onClick={() => setShowExitConfirm(true)}>
          {t('game.exit')}
        </Button>
        <h1 className="font-title text-base font-bold text-forest-green truncate mx-2">
          {store.crossword.title}
        </h1>
        {/* Connection indicator for online games */}
        {isOnline ? (
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${gameState.online.isConnected ? 'bg-forest-green' : 'bg-crimson animate-pulse'}`} />
            <span className="text-sm text-warm-brown/60 font-medium">
              {gameState.online.isConnected ? t('game.connected') : t('game.disconnected')}
            </span>
          </div>
        ) : (
          <div className="w-8" />
        )}
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
                  <p className={`text-sm font-bold truncate text-${colorClass}`}>
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
          animate={gameState.isMyTurn && !gameState.isBotTurn ? { boxShadow: ['0 0 10px rgba(88,156,72,0.2)', '0 0 20px rgba(88,156,72,0.4)', '0 0 10px rgba(88,156,72,0.2)'] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`
            inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-base font-bold
            ${!gameState.isMyTurn || gameState.isBotTurn
              ? 'bg-night-blue/15 text-night-blue border border-night-blue/20'
              : 'bg-forest-green/15 text-forest-green border border-forest-green/20'
            }
          `}
        >
          <span className={`w-2 h-2 rounded-full ${!gameState.isMyTurn || gameState.isBotTurn ? 'bg-night-blue' : 'bg-forest-green'} ${gameState.isBotThinking ? 'animate-pulse' : ''}`} />
          {getTurnText()}
        </motion.div>
        {gameState.isMyTurn && !gameState.isBotTurn && store.turnPhase === 'typing' && crosswordHook.selectedWord && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleHint}
            disabled={store.players[gameState.currentPlayerIndex].score < HINT_LETTER_COST}
            className={`
              px-3 py-1.5 rounded-full text-sm font-bold transition-all
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

      {/* Bot question display (solo mode) */}
      <AnimatePresence>
        {gameState.isBotThinking && gameState.botQuestionDisplay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 relative z-10"
          >
            <div className="max-w-lg mx-auto glass rounded-2xl p-4">
              <p className="text-sm text-night-blue font-semibold mb-1">{t('game.botQuestion')}</p>
              <p className="text-base text-warm-brown font-medium mb-2">
                {gameState.botQuestionDisplay.question}
              </p>
              {gameState.botQuestionDisplay.usedHint && !gameState.botQuestionDisplay.answer && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-night-blue/60 italic">
                  {t('game.botUsedHint')}
                </motion.p>
              )}
              {gameState.botQuestionDisplay.answer && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
                  {gameState.botQuestionDisplay.usedHint && (
                    <span className="mr-1.5">💡</span>
                  )}
                  <span className="text-night-blue/80">{t('game.botAnswered')}: </span>
                  <strong className={gameState.botQuestionDisplay.isCorrect ? 'text-forest-green' : 'text-crimson'}>
                    {gameState.botQuestionDisplay.answer}
                    {gameState.botQuestionDisplay.isCorrect ? ' ✓' : ' ✗'}
                  </strong>
                </motion.p>
              )}
              {store.turnPhase === 'feedback' && store.lastFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2"
                >
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-mono font-extrabold ${
                    store.lastFeedback.isCorrect
                      ? 'bg-forest-green/15 text-forest-green'
                      : 'bg-crimson/15 text-crimson'
                  }`}>
                    +{store.lastFeedback.pointsEarned} {t('feedback.pointsEarned')}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spectator question display (online multiplayer — opponent's turn) */}
      <AnimatePresence>
        {isOnline && !gameState.isMyTurn && (store.turnPhase === 'question' || store.turnPhase === 'feedback') && store.currentQuestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-3 relative z-10"
          >
            <div className="max-w-lg mx-auto glass rounded-2xl p-4">
              <p className="text-sm text-night-blue font-semibold mb-1">
                {t('game.opponentQuestion', { name: store.players[gameState.currentPlayerIndex].name })}
              </p>
              <p className="text-base text-warm-brown font-medium mb-2">
                {store.currentQuestion.question}
              </p>

              {store.turnPhase === 'question' && (
                <motion.p
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="text-sm text-night-blue/60 italic"
                >
                  {t('game.opponentAnswering')}
                </motion.p>
              )}

              {store.turnPhase === 'feedback' && store.lastFeedback && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                  <p className="text-sm">
                    <strong className={store.lastFeedback.isCorrect ? 'text-forest-green' : 'text-crimson'}>
                      {store.lastFeedback.isCorrect
                        ? t('game.opponentGotIt', { name: store.players[gameState.currentPlayerIndex].name })
                        : t('game.opponentMissed', { name: store.players[gameState.currentPlayerIndex].name })
                      }
                    </strong>
                  </p>
                  {!store.lastFeedback.isCorrect && (
                    <p className="text-sm text-warm-brown/70">
                      {t('game.correctAnswerWas', { answer: store.currentQuestion.answer })}
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 p-3 overflow-auto max-w-4xl mx-auto w-full relative z-10">
        {/* Crossword Grid */}
        <div className="flex-1 flex flex-col items-center">
          {store.turnPhase === 'selecting' && gameState.isMyTurn && !gameState.isBotTurn && (
            <p className="text-base text-warm-brown/70 mb-2 font-medium">{t('game.selectWord')}</p>
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
            } ${(gameState.isBotTurn || notMyTurn) ? 'opacity-60 pointer-events-none' : ''}`}
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
                    onClick={() => handleCellClick(row, col)}
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
          {crosswordHook.isCurrentWordFilled && gameState.isMyTurn && !gameState.isBotTurn && store.turnPhase === 'typing' && (
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
              <h3 className="font-title text-base font-bold text-forest-green mb-2 uppercase tracking-wider">
                {t(`game.${dir}`)}
              </h3>
              <ul className="space-y-1">
                {store.crossword!.words
                  .filter((w) => w.direction === dir)
                  .sort((a, b) => a.id - b.id)
                  .map((word) => {
                    const isCompleted = store.completedWords.includes(word.id);
                    const isActive = store.selectedWordId === word.id;

                    return (
                      <li
                        key={word.id}
                        onClick={() => handleClueClick(word.id)}
                        className={`
                          text-base px-3 py-2.5 rounded-lg cursor-pointer transition-all leading-snug
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

      {/* Question Modal - only show for the active player */}
      {gameState.isMyTurn && !gameState.isBotTurn && store.turnPhase === 'question' && store.currentQuestion && crosswordHook.selectedWord && (
        <QuestionModal
          question={store.currentQuestion}
          word={crosswordHook.selectedWord}
          onAnswer={handleAnswerSubmitted}
          onTimeout={gameState.handleTriviaTimeout}
        />
      )}

      {/* Feedback Overlay */}
      <AnimatePresence>
        {store.turnPhase === 'feedback' && store.lastFeedback && (!isOnline || gameState.isMyTurn) && !gameState.isBotTurn && (
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

      {/* Opponent Disconnected Modal */}
      {isOnline && (
        <Modal isOpen={showDisconnect} onClose={() => setShowDisconnect(false)}>
          <div className="glass-strong rounded-3xl p-6 text-center">
            <div className="text-4xl mb-3">📡</div>
            <h3 className="font-title text-lg font-extrabold text-crimson mb-2">
              {t('game.opponentDisconnected')}
            </h3>
            <p className="text-warm-brown text-base mb-4">
              {t('game.opponentDisconnectedDesc')}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="ghost" onClick={() => setShowDisconnect(false)}>
                {t('game.waitForReconnect')}
              </Button>
              <Button variant="danger" onClick={handleExit}>
                {t('game.leaveGame')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
