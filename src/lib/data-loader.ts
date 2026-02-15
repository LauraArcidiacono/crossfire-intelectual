import type { Category, Crossword, Question } from '../types/game.types';
import crosswordsEn from '../data/crosswords/en.json';
import crosswordsEs from '../data/crosswords/es.json';
import questionsEn from '../data/questions/en.json';
import questionsEs from '../data/questions/es.json';

type Language = 'en' | 'es';

const crosswordData: Record<Language, Crossword[]> = {
  en: crosswordsEn as unknown as Crossword[],
  es: crosswordsEs as unknown as Crossword[],
};

const questionData: Record<Language, Record<string, Question[]>> = {
  en: questionsEn as unknown as Record<string, Question[]>,
  es: questionsEs as unknown as Record<string, Question[]>,
};

// Track last used crossword to avoid repetition
let lastCrosswordId: Record<Language, number | null> = { en: null, es: null };

export function getRandomCrossword(language: Language): Crossword {
  const crosswords = crosswordData[language];
  if (crosswords.length <= 1) return crosswords[0];

  // Pick a different crossword than last time
  let index: number;
  do {
    index = Math.floor(Math.random() * crosswords.length);
  } while (crosswords[index].id === lastCrosswordId[language] && crosswords.length > 1);

  lastCrosswordId[language] = crosswords[index].id;
  return crosswords[index];
}

export function getCrosswordById(id: number, language: Language): Crossword | undefined {
  return crosswordData[language].find((c) => c.id === id);
}

export function getRandomQuestion(
  categories: Category[],
  language: Language,
  usedIds: Set<string>
): Question | null {
  const allQuestions: Question[] = [];

  for (const cat of categories) {
    const catQuestions = questionData[language][cat] || [];
    allQuestions.push(...catQuestions.filter((q) => !usedIds.has(q.id)));
  }

  if (allQuestions.length === 0) return null;

  const index = Math.floor(Math.random() * allQuestions.length);
  return allQuestions[index];
}

export function getQuestionForCategory(
  category: Category,
  language: Language,
  usedIds: Set<string>
): Question | null {
  const questions = (questionData[language][category] || []).filter(
    (q) => !usedIds.has(q.id)
  );

  if (questions.length === 0) return null;

  const index = Math.floor(Math.random() * questions.length);
  return questions[index];
}

export function shuffleOptions(options: string[]): string[] {
  return [...options].sort(() => Math.random() - 0.5);
}
