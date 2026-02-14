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

/**
 * Detect the type of an answer to generate coherent distractors.
 */
function detectAnswerType(answer: string): 'year' | 'number' | 'text' {
  const trimmed = answer.trim();
  if (/^\d{3,4}$/.test(trimmed) && Number(trimmed) >= 100 && Number(trimmed) <= 2100) return 'year';
  if (/^\d+$/.test(trimmed)) return 'number';
  return 'text';
}

/**
 * Generate plausible wrong years near the correct one.
 */
function generateYearDistractors(correctYear: number): string[] {
  const candidates: number[] = [];
  const offsets = [-100, -50, -30, -20, -10, 10, 20, 30, 50, 100];
  for (const offset of offsets) {
    const year = correctYear + offset;
    if (year > 0 && year <= 2100) candidates.push(year);
  }
  const shuffled = candidates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map(String);
}

/**
 * Generate 4 options for an open question.
 * Ensures distractors match the answer type (years with years, text with text).
 */
export function generateOptionsForQuestion(
  question: Question,
  language: Language
): string[] {
  const answerType = detectAnswerType(question.answer);

  // For years: generate plausible nearby years
  if (answerType === 'year') {
    const distractors = generateYearDistractors(Number(question.answer.trim()));
    const options = [question.answer, ...distractors];
    return options.sort(() => Math.random() - 0.5);
  }

  // For text/number: pick from same category, matching answer type
  const catQuestions = questionData[language][question.category] || [];
  const sameTypeAnswers = catQuestions
    .filter((q) => q.id !== question.id && q.answer !== question.answer && detectAnswerType(q.answer) === answerType)
    .map((q) => q.answer);

  // Deduplicate and shuffle
  const unique = [...new Set(sameTypeAnswers)];
  const shuffled = unique.sort(() => Math.random() - 0.5);
  let distractors = shuffled.slice(0, 3);

  // If not enough same-type distractors, expand to all categories (same type)
  if (distractors.length < 3) {
    const allCategories = Object.values(questionData[language]).flat();
    const extraAnswers = allCategories
      .filter((q) => q.id !== question.id && q.answer !== question.answer && detectAnswerType(q.answer) === answerType)
      .map((q) => q.answer);
    const extraUnique = [...new Set(extraAnswers)].filter((a) => !distractors.includes(a));
    const extraShuffled = extraUnique.sort(() => Math.random() - 0.5);
    distractors = [...distractors, ...extraShuffled.slice(0, 3 - distractors.length)];
  }

  // Last resort fallback
  while (distractors.length < 3) {
    distractors.push(`Opción ${distractors.length + 1}`);
  }

  const options = [question.answer, ...distractors];
  return options.sort(() => Math.random() - 0.5);
}
