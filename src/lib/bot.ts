import type { Question, Word } from '../types/game.types';
import { BOT_ACCURACY, BOT_THINK_MAX, BOT_THINK_MIN } from '../constants/game-config';

export function botSelectWord(availableWords: Word[]): Word {
  const index = Math.floor(Math.random() * availableWords.length);
  return availableWords[index];
}

export function botAnswerQuestion(question: Question): { answer: string; isCorrect: boolean } {
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
