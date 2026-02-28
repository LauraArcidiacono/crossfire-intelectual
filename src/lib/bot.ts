import type { Question, Word } from '../types/game.types';
import { BOT_ACCURACY, BOT_HINT_PROBABILITY, BOT_THINK_MAX, BOT_THINK_MIN, TRIVIA_HINT_COST } from '../constants/game-config';

export function botSelectWord(availableWords: Word[]): Word {
  const index = Math.floor(Math.random() * availableWords.length);
  return availableWords[index];
}

export function botAnswerQuestion(question: Question, usedHint = false): { answer: string; isCorrect: boolean } {
  // When hint is used the bot can see the options and always picks correctly
  if (usedHint) {
    return { answer: question.answer, isCorrect: true };
  }

  const isCorrect = Math.random() < BOT_ACCURACY;

  if (isCorrect) {
    return { answer: question.answer, isCorrect: true };
  }

  if (question.type === 'multiple-choice' && question.options) {
    const wrongOptions = question.options.filter(
      (opt) => opt.toLowerCase() !== question.answer.toLowerCase()
    );
    const wrongAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    return { answer: wrongAnswer, isCorrect: false };
  }

  return { answer: '', isCorrect: false };
}

export function getBotThinkDelay(): number {
  return BOT_THINK_MIN + Math.random() * (BOT_THINK_MAX - BOT_THINK_MIN);
}

export function botShouldUseHint(botScore: number): boolean {
  if (botScore < TRIVIA_HINT_COST) return false;
  return Math.random() < BOT_HINT_PROBABILITY;
}
