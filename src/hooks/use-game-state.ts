import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { calculateScore, checkVictoryCondition, validateAnswer } from '../lib/game-logic';
import { botAnswerQuestion, botSelectWord, botShouldUseHint, getBotThinkDelay } from '../lib/bot';
import { cellKey, getHintCell, getWordCells } from '../lib/crossword';
import { getRandomQuestion } from '../lib/data-loader';
import { useOnlineGame } from './use-online-game';
import type { GameMove, Word } from '../types/game.types';
import {
  FEEDBACK_CORRECT_DURATION,
  FEEDBACK_INCORRECT_DURATION,
  HINT_LETTER_COST,
  TRIVIA_HINT_COST,
  TRIVIA_TIMER,
} from '../constants/game-config';

interface BotQuestionDisplay {
  question: string;
  answer: string | null;
  isCorrect: boolean;
  usedHint: boolean;
}

export function useGameState() {
  const store = useGameStore();
  const online = useOnlineGame();
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botQuestionDisplay, setBotQuestionDisplay] = useState<BotQuestionDisplay | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const currentPlayerIndex = (store.currentTurn === 1 ? 0 : 1) as 0 | 1;

  // Determine if it's the local player's turn
  const isMyTurn = (() => {
    if (store.mode === 'solo') return store.currentTurn === 1;
    if (store.playerRole === 'host') return store.currentTurn === 1;
    if (store.playerRole === 'guest') return store.currentTurn === 2;
    return true; // fallback
  })();

  const isBotTurn = store.mode === 'solo' && store.currentTurn === 2;
  const isGuestTurn = online.isOnline && store.currentTurn === 2;

  // Host processes a word submission (works for both host's own turn and guest moves)
  const processWordSubmitted = useCallback(
    async (word: Word, isValid: boolean, playerIdx: 0 | 1) => {
      if (!isValid) return;

      store.completeWord(word.id);
      store.incrementWordStats(playerIdx);

      if (store.crossword) {
        const cells = getWordCells(word);
        cells.forEach((c, i) => {
          store.setCellInput(cellKey(c.row, c.col), word.word[i]);
        });
      }

      const question = await getRandomQuestion(
        store.selectedCategories,
        store.language,
        store.usedQuestionIds
      );

      if (question) {
        store.addUsedQuestionId(question.id);
        store.setCurrentQuestion(question);
        store.setTriviaTimeRemaining(TRIVIA_TIMER);
        store.setTurnPhase('question');
      } else {
        const points = calculateScore(word, false);
        store.updateScore(playerIdx, points);
        store.setLastFeedback({ isCorrect: false, pointsEarned: points });
        store.recordWordCompletion({ wordId: word.id, playerIndex: playerIdx, points });
        store.setTurnPhase('feedback');
      }
    },
    [store]
  );

  // Host processes an answer submission
  const processAnswerSubmitted = useCallback(
    (answer: string, usedHint: boolean, playerIdx: 0 | 1) => {
      if (!store.currentQuestion || !store.selectedWordId || !store.crossword) return;

      const word = store.crossword.words.find((w) => w.id === store.selectedWordId);
      if (!word) return;

      const isCorrect = validateAnswer(store.currentQuestion, answer);
      let points: number;
      if (isCorrect && usedHint) {
        const base = calculateScore(word, false);
        points = Math.floor(base * 1.5);
      } else {
        points = calculateScore(word, isCorrect);
      }

      store.updateScore(playerIdx, points);
      if (isCorrect) {
        store.incrementAnswerStats(playerIdx);
      }

      store.setLastFeedback({
        isCorrect,
        pointsEarned: points,
        correctAnswer: isCorrect ? undefined : store.currentQuestion.answer,
      });
      store.recordWordCompletion({ wordId: word.id, playerIndex: playerIdx, points });
      store.setTurnPhase('feedback');
    },
    [store]
  );

  // Public handlers: called by UI or forwarded from guest moves
  const handleWordSubmitted = useCallback(
    (word: Word, isValid: boolean) => {
      // Guest sends move to host instead of processing locally
      if (online.isGuest) {
        if (isValid) {
          online.sendGameMove({ type: 'submit-word', wordId: word.id });
        }
        return;
      }
      processWordSubmitted(word, isValid, currentPlayerIndex);
    },
    [online.isGuest, online.sendGameMove, processWordSubmitted, currentPlayerIndex]
  );

  const handleAnswerSubmitted = useCallback(
    (answer: string, usedHint = false) => {
      if (online.isGuest) {
        online.sendGameMove({ type: 'submit-answer', answer, usedHint });
        return;
      }
      processAnswerSubmitted(answer, usedHint, currentPlayerIndex);
    },
    [online.isGuest, online.sendGameMove, processAnswerSubmitted, currentPlayerIndex]
  );

  const handleTurnTimeout = useCallback(() => {
    if (online.isGuest) {
      if (!isMyTurn) return;
      online.sendGameMove({ type: 'timeout' });
      return;
    }
    store.switchTurn();
  }, [store, online.isGuest, online.sendGameMove, isMyTurn]);

  const handleTriviaTimeout = useCallback(() => {
    if (online.isGuest) {
      if (!isMyTurn) return;
      online.sendGameMove({ type: 'timeout' });
      return;
    }

    if (!store.selectedWordId || !store.crossword) return;
    const word = store.crossword.words.find((w) => w.id === store.selectedWordId);
    if (!word) return;

    const points = calculateScore(word, false);
    store.updateScore(currentPlayerIndex, points);
    store.setLastFeedback({
      isCorrect: false,
      pointsEarned: points,
      correctAnswer: store.currentQuestion?.answer,
    });
    store.recordWordCompletion({ wordId: word.id, playerIndex: currentPlayerIndex, points });
    store.setTurnPhase('feedback');
  }, [store, currentPlayerIndex, online.isGuest, online.sendGameMove, isMyTurn]);

  const handleFeedbackComplete = useCallback(() => {
    if (!store.crossword) return;
    // Guest doesn't process feedback completion — host does
    if (online.isGuest) return;

    const result = checkVictoryCondition(store.players, store.completedWords, store.crossword);

    if (result !== 'playing') {
      if (store.gameStartedAt) {
        const elapsed = Math.floor((Date.now() - store.gameStartedAt) / 1000);
        store.setGameStats({ ...store.gameStats, totalTimePlayed: elapsed });
      }
      store.setStatus('finished');
      store.setScreen('victory');
      return;
    }

    store.switchTurn();
  }, [store, online.isGuest]);

  // Guest word selection: send to host
  const handleGuestSelectWord = useCallback(
    (wordId: number) => {
      if (!online.isGuest) return;
      online.sendGameMove({ type: 'select-word', wordId });
    },
    [online.isGuest, online.sendGameMove]
  );

  const handleGuestCellInput = useCallback(
    (key: string, letter: string) => {
      if (!online.isGuest) return;
      online.sendGameMove({ type: 'cell-input', key, letter });
    },
    [online.isGuest, online.sendGameMove]
  );

  const handleGuestHint = useCallback(() => {
    if (!online.isGuest) return;
    online.sendGameMove({ type: 'hint' });
  }, [online.isGuest, online.sendGameMove]);

  // Host: listen for guest moves and process them
  useEffect(() => {
    if (!online.isHost || !online.isOnline) return;

    online.onGuestMove((move: GameMove) => {
      const guestIdx = 1 as const;

      switch (move.type) {
        case 'select-word': {
          store.selectWord(move.wordId);
          const word = store.crossword?.words.find((w) => w.id === move.wordId);
          if (word) {
            store.setSelectedCell({ row: word.row, col: word.col });
          }
          break;
        }
        case 'cell-input': {
          store.setCellInput(move.key, move.letter);
          break;
        }
        case 'submit-word': {
          const word = store.crossword?.words.find((w) => w.id === move.wordId);
          if (word) {
            processWordSubmitted(word, true, guestIdx);
          }
          break;
        }
        case 'submit-answer': {
          processAnswerSubmitted(move.answer, move.usedHint, guestIdx);
          break;
        }
        case 'hint': {
          if (!store.crossword) break;
          const selectedWord = store.crossword.words.find((w) => w.id === store.selectedWordId);
          if (!selectedWord) break;
          if (store.players[guestIdx].score < HINT_LETTER_COST) break;
          const hint = getHintCell(selectedWord, store.cellInputs, store.crossword.grid);
          if (hint) {
            store.setCellInput(cellKey(hint.row, hint.col), hint.letter);
            store.updateScore(guestIdx, -HINT_LETTER_COST);
          }
          break;
        }
        case 'timeout': {
          store.switchTurn();
          break;
        }
      }
    });
  }, [online.isHost, online.isOnline, online.onGuestMove, store, processWordSubmitted, processAnswerSubmitted]);

  // Auto-close feedback after duration
  useEffect(() => {
    if (store.turnPhase !== 'feedback' || !store.lastFeedback) return;
    // Guest doesn't auto-close feedback (host handles it and syncs)
    if (online.isGuest) return;

    const duration = store.lastFeedback.isCorrect
      ? FEEDBACK_CORRECT_DURATION
      : FEEDBACK_INCORRECT_DURATION;

    const timer = setTimeout(() => {
      handleFeedbackComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [store.turnPhase, store.lastFeedback, handleFeedbackComplete, online.isGuest]);

  // Clear bot question display on turn switch
  useEffect(() => {
    if (!isBotTurn) {
      setIsBotThinking(false);
      setBotQuestionDisplay(null);
    }
  }, [isBotTurn]);

  // Bot turn simulation (solo mode only)
  useEffect(() => {
    if (!isBotTurn || store.status !== 'playing') return;

    if (store.turnPhase === 'selecting') {
      if (!store.crossword) return;
      const available = store.crossword.words.filter(
        (w) => !store.completedWords.includes(w.id)
      );
      if (available.length === 0) return;

      setIsBotThinking(true);
      setBotQuestionDisplay(null);
      const delay = getBotThinkDelay();

      botTimeoutRef.current = setTimeout(() => {
        const word = botSelectWord(available);
        store.selectWord(word.id);
        store.setSelectedCell({ row: word.row, col: word.col });

        if (store.crossword) {
          const cells = getWordCells(word);
          cells.forEach((c, i) => {
            setTimeout(() => {
              store.setCellInput(cellKey(c.row, c.col), word.word[i]);
            }, i * 300);
          });
        }

        const typingDuration = (getWordCells(word).length * 300) + 800;
        setTimeout(() => {
          setIsBotThinking(false);
          processWordSubmitted(word, true, 1);
        }, typingDuration);
      }, delay);

      return () => {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      };
    }

    if (store.turnPhase === 'question' && store.currentQuestion) {
      setIsBotThinking(true);
      const questionText = store.currentQuestion.question;
      const willUseHint = botShouldUseHint(store.players[1].score);

      setBotQuestionDisplay({ question: questionText, answer: null, isCorrect: false, usedHint: false });

      const thinkDelay = getBotThinkDelay();

      botTimeoutRef.current = setTimeout(() => {
        if (willUseHint) {
          store.updateScore(1, -TRIVIA_HINT_COST);
          setBotQuestionDisplay({ question: questionText, answer: null, isCorrect: false, usedHint: true });

          setTimeout(() => {
            const { answer, isCorrect } = botAnswerQuestion(store.currentQuestion!, true);
            setBotQuestionDisplay({ question: questionText, answer, isCorrect, usedHint: true });

            setTimeout(() => {
              processAnswerSubmitted(answer, true, 1);
            }, 2000);
          }, 1500);
        } else {
          const { answer, isCorrect } = botAnswerQuestion(store.currentQuestion!);
          setBotQuestionDisplay({ question: questionText, answer, isCorrect, usedHint: false });

          setTimeout(() => {
            processAnswerSubmitted(answer, false, 1);
          }, 2000);
        }
      }, thinkDelay);

      return () => {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      };
    }
  }, [isBotTurn, store.turnPhase, store.status]);

  // Update turn timer in store
  const syncTurnTimer = useCallback((time: number) => {
    store.setTimeRemaining(time);
  }, [store]);

  return {
    turnPhase: store.turnPhase,
    currentPlayerIndex,
    isMyTurn,
    isBotTurn,
    isBotThinking,
    botQuestionDisplay,
    isGuestTurn,
    handleWordSubmitted,
    handleAnswerSubmitted,
    handleTurnTimeout,
    handleTriviaTimeout,
    handleFeedbackComplete,
    syncTurnTimer,
    // Online-specific handlers for guest UI
    handleGuestSelectWord,
    handleGuestCellInput,
    handleGuestHint,
    // Online state
    online,
  };
}
