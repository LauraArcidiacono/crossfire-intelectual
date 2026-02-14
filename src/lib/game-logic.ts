import type { Crossword, Player, Question, Word } from '../types/game.types';
import { calculateWordScore } from '../constants/scrabble-values';
import { VICTORY_POINTS } from '../constants/game-config';

export function validateWord(word: Word, input: string): boolean {
  return word.word.toUpperCase() === input.toUpperCase();
}

export function normalizeForComparison(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'en', 'un', 'una', 'al', 'lo', 'y', 'o', 'con', 'por', 'para',
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'and', 'or', 'for', 'with', 'by',
]);

function getKeyWords(text: string): string[] {
  return normalizeForComparison(text)
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));
}

export function validateAnswer(question: Question, answer: string): boolean {
  const normalizedAnswer = normalizeForComparison(answer);
  const normalizedCorrect = normalizeForComparison(question.answer);

  // Exact match always works
  if (normalizedCorrect === normalizedAnswer) return true;

  // Multiple choice: only exact match
  if (question.type === 'multiple-choice') return false;

  // Flexible matching for open questions:
  // Check if all key words from the user's answer exist in the correct answer's words
  const correctWords = getKeyWords(question.answer);
  const answerWords = getKeyWords(answer);

  if (answerWords.length === 0) return false;

  // All answer words must be present in the correct answer
  const allWordsMatch = answerWords.every((aw) =>
    correctWords.some((cw) => cw === aw)
  );

  if (allWordsMatch && answerWords.length >= 1) return true;

  // Substring containment (for multi-word answers): "Garcia Marquez" in "Gabriel Garcia Marquez"
  if (normalizedAnswer.length >= 3 && normalizedCorrect.includes(normalizedAnswer)) return true;
  if (normalizedCorrect.length >= 3 && normalizedAnswer.includes(normalizedCorrect)) return true;

  return false;
}

export function calculateScore(word: Word, isCorrect: boolean): number {
  const basePoints = calculateWordScore(word.word);
  return isCorrect ? basePoints * 2 : basePoints;
}

export function getAvailableWords(crossword: Crossword, completedWords: number[]): Word[] {
  return crossword.words.filter((w) => !completedWords.includes(w.id));
}

export function checkVictoryCondition(
  players: [Player, Player],
  completedWords: number[],
  crossword: Crossword
): 'playing' | 'victory' | 'tie' {
  const allWordsCompleted = completedWords.length >= crossword.words.length;
  const p1Reached = players[0].score >= VICTORY_POINTS;
  const p2Reached = players[1].score >= VICTORY_POINTS;

  if (p1Reached && p2Reached) return 'tie';
  if (p1Reached || p2Reached) return 'victory';
  if (allWordsCompleted) {
    if (players[0].score === players[1].score) return 'tie';
    return 'victory';
  }
  return 'playing';
}

export function getWinner(players: [Player, Player]): Player | null {
  if (players[0].score === players[1].score) return null;
  return players[0].score > players[1].score ? players[0] : players[1];
}
