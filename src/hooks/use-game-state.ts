import { useCallback, useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/game-store';
import { calculateScore, checkVictoryCondition, validateAnswer } from '../lib/game-logic';
import { botAnswerQuestion, botSelectWord, getBotThinkDelay } from '../lib/bot';
import { cellKey, getWordCells } from '../lib/crossword';
import { getRandomQuestion } from '../lib/data-loader';
import type { Word } from '../types/game.types';
import {
  FEEDBACK_CORRECT_DURATION,
  FEEDBACK_INCORRECT_DURATION,
  TRIVIA_TIMER,
} from '../constants/game-config';

interface BotQuestionDisplay {
  question: string;
  answer: string | null;
  isCorrect: boolean;
}

export function useGameState() {
  const store = useGameStore();
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [botQuestionDisplay, setBotQuestionDisplay] = useState<BotQuestionDisplay | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const currentPlayerIndex = (store.currentTurn === 1 ? 0 : 1) as 0 | 1;
  const isMyTurn = store.mode === 'solo' ? store.currentTurn === 1 : true;
  const isBotTurn = store.mode === 'solo' && store.currentTurn === 2;

  const handleWordSubmitted = useCallback(
    (word: Word, isValid: boolean) => {
      if (!isValid) return;

      store.completeWord(word.id);
      store.incrementWordStats(currentPlayerIndex);

      // Fill in all cells for the completed word
      if (store.crossword) {
        const cells = getWordCells(word);
        cells.forEach((c, i) => {
          store.setCellInput(cellKey(c.row, c.col), word.word[i]);
        });
      }

      // Get a question for this word's category
      const question = getRandomQuestion(
        [word.category],
        store.language,
        store.usedQuestionIds
      );

      if (question) {
        store.addUsedQuestionId(question.id);
        store.setCurrentQuestion(question);
        store.setTriviaTimeRemaining(TRIVIA_TIMER);
        store.setTurnPhase('question');
      } else {
        // No question available, just award base points
        const points = calculateScore(word, false);
        store.updateScore(currentPlayerIndex, points);
        store.setLastFeedback({ isCorrect: false, pointsEarned: points });
        store.recordWordCompletion({ wordId: word.id, playerIndex: currentPlayerIndex, points });
        store.setTurnPhase('feedback');
      }
    },
    [store, currentPlayerIndex]
  );

  const handleAnswerSubmitted = useCallback(
    (answer: string, usedHint = false) => {
      if (!store.currentQuestion || !store.selectedWordId || !store.crossword) return;

      const word = store.crossword.words.find((w) => w.id === store.selectedWordId);
      if (!word) return;

      const isCorrect = validateAnswer(store.currentQuestion, answer);
      let points: number;
      if (isCorrect && usedHint) {
        // Hint penalty: base + bonus*0.5 = base * 1.5
        const base = calculateScore(word, false);
        points = Math.floor(base * 1.5);
      } else {
        points = calculateScore(word, isCorrect);
      }

      store.updateScore(currentPlayerIndex, points);
      if (isCorrect) {
        store.incrementAnswerStats(currentPlayerIndex);
      }

      store.setLastFeedback({
        isCorrect,
        pointsEarned: points,
        correctAnswer: isCorrect ? undefined : store.currentQuestion.answer,
      });
      store.recordWordCompletion({ wordId: word.id, playerIndex: currentPlayerIndex, points });
      store.setTurnPhase('feedback');
    },
    [store, currentPlayerIndex]
  );

  const handleTurnTimeout = useCallback(() => {
    store.switchTurn();
  }, [store]);

  const handleTriviaTimeout = useCallback(() => {
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
  }, [store, currentPlayerIndex]);

  const handleFeedbackComplete = useCallback(() => {
    if (!store.crossword) return;

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
  }, [store]);

  // Auto-close feedback after duration
  useEffect(() => {
    if (store.turnPhase !== 'feedback' || !store.lastFeedback) return;

    const duration = store.lastFeedback.isCorrect
      ? FEEDBACK_CORRECT_DURATION
      : FEEDBACK_INCORRECT_DURATION;

    const timer = setTimeout(() => {
      handleFeedbackComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [store.turnPhase, store.lastFeedback, handleFeedbackComplete]);

  // Clear bot question display on turn switch
  useEffect(() => {
    if (!isBotTurn) {
      setBotQuestionDisplay(null);
    }
  }, [isBotTurn]);

  // Bot turn simulation - slower with visible feedback
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

        // Bot "types" the correct word letter by letter
        if (store.crossword) {
          const cells = getWordCells(word);
          cells.forEach((c, i) => {
            setTimeout(() => {
              store.setCellInput(cellKey(c.row, c.col), word.word[i]);
            }, i * 300);
          });
        }

        // Auto-submit the word after typing animation
        const typingDuration = (getWordCells(word).length * 300) + 800;
        setTimeout(() => {
          setIsBotThinking(false);
          handleWordSubmitted(word, true);
        }, typingDuration);
      }, delay);

      return () => {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      };
    }

    if (store.turnPhase === 'question' && store.currentQuestion) {
      setIsBotThinking(true);
      const questionText = store.currentQuestion.question;

      // Show the question first
      setBotQuestionDisplay({ question: questionText, answer: null, isCorrect: false });

      const thinkDelay = getBotThinkDelay();

      botTimeoutRef.current = setTimeout(() => {
        const { answer, isCorrect } = botAnswerQuestion(store.currentQuestion!);

        // Show the answer for a moment
        setBotQuestionDisplay({ question: questionText, answer, isCorrect });

        // Wait a bit then submit
        setTimeout(() => {
          setIsBotThinking(false);
          setBotQuestionDisplay(null);
          handleAnswerSubmitted(answer);
        }, 2000);
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
    handleWordSubmitted,
    handleAnswerSubmitted,
    handleTurnTimeout,
    handleTriviaTimeout,
    handleFeedbackComplete,
    syncTurnTimer,
  };
}
