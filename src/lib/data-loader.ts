import type { Category, Crossword, Question } from '../types/game.types';

type Language = 'en' | 'es';

const crosswordCache: Partial<Record<Language, Crossword[]>> = {};
const questionCache: Partial<Record<Language, Record<string, Question[]>>> = {};

async function loadCrosswords(language: Language): Promise<Crossword[]> {
  if (crosswordCache[language]) return crosswordCache[language]!;
  const data = await import(`../data/crosswords/${language}.json`);
  crosswordCache[language] = data.default as Crossword[];
  return crosswordCache[language]!;
}

async function loadQuestions(language: Language): Promise<Record<string, Question[]>> {
  if (questionCache[language]) return questionCache[language]!;
  const data = await import(`../data/questions/${language}.json`);
  questionCache[language] = data.default as Record<string, Question[]>;
  return questionCache[language]!;
}

// Track last used crossword to avoid repetition
const lastCrosswordId: Record<Language, number | null> = { en: null, es: null };

export async function getRandomCrossword(language: Language): Promise<Crossword> {
  const crosswords = await loadCrosswords(language);
  if (crosswords.length <= 1) return crosswords[0];

  // Pick a different crossword than last time
  let index: number;
  do {
    index = Math.floor(Math.random() * crosswords.length);
  } while (crosswords[index].id === lastCrosswordId[language] && crosswords.length > 1);

  lastCrosswordId[language] = crosswords[index].id;
  return crosswords[index];
}

export async function getCrosswordById(id: number, language: Language): Promise<Crossword | undefined> {
  const crosswords = await loadCrosswords(language);
  return crosswords.find((c) => c.id === id);
}

export async function getRandomQuestion(
  categories: Category[],
  language: Language,
  usedIds: Set<string>
): Promise<Question | null> {
  const questionData = await loadQuestions(language);
  const allQuestions: Question[] = [];

  for (const cat of categories) {
    const catQuestions = questionData[cat] || [];
    allQuestions.push(...catQuestions.filter((q) => !usedIds.has(q.id)));
  }

  if (allQuestions.length === 0) return null;

  const index = Math.floor(Math.random() * allQuestions.length);
  return allQuestions[index];
}

export async function getQuestionForCategory(
  category: Category,
  language: Language,
  usedIds: Set<string>
): Promise<Question | null> {
  const questionData = await loadQuestions(language);
  const questions = (questionData[category] || []).filter(
    (q) => !usedIds.has(q.id)
  );

  if (questions.length === 0) return null;

  const index = Math.floor(Math.random() * questions.length);
  return questions[index];
}

export function shuffleOptions(options: string[]): string[] {
  return [...options].sort(() => Math.random() - 0.5);
}
