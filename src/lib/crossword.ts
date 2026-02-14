import type { CellPosition, Crossword, CrosswordGrid, Direction, Word } from '../types/game.types';

export function isBlackCell(grid: CrosswordGrid, row: number, col: number): boolean {
  return grid.blackCells.some(([r, c]) => r === row && c === col);
}

export function getPrefilledLetter(grid: CrosswordGrid, row: number, col: number): string | null {
  const entry = grid.prefilled.find((p) => p.row === row && p.col === col);
  return entry ? entry.letter.toUpperCase() : null;
}

export function cellKey(row: number, col: number): string {
  return `${row}-${col}`;
}

export function getWordCells(word: Word): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let i = 0; i < word.word.length; i++) {
    if (word.direction === 'across') {
      cells.push({ row: word.row, col: word.col + i });
    } else {
      cells.push({ row: word.row + i, col: word.col });
    }
  }
  return cells;
}

export function getWordsAtCell(crossword: Crossword, row: number, col: number): Word[] {
  return crossword.words.filter((word) => {
    const cells = getWordCells(word);
    return cells.some((c) => c.row === row && c.col === col);
  });
}

export function getWordNumberAtCell(crossword: Crossword, row: number, col: number): number | null {
  const word = crossword.words.find((w) => w.row === row && w.col === col);
  return word ? word.id : null;
}

export function buildWordInput(word: Word, cellInputs: Record<string, string>, grid: CrosswordGrid): string {
  const cells = getWordCells(word);
  return cells
    .map((c) => {
      const prefilled = getPrefilledLetter(grid, c.row, c.col);
      if (prefilled) return prefilled;
      return cellInputs[cellKey(c.row, c.col)] || '';
    })
    .join('');
}

export function getNextCell(
  current: CellPosition,
  _direction: Direction,
  word: Word
): CellPosition | null {
  const cells = getWordCells(word);
  const idx = cells.findIndex((c) => c.row === current.row && c.col === current.col);
  if (idx === -1 || idx >= cells.length - 1) return null;
  return cells[idx + 1];
}

export function getPreviousCell(
  current: CellPosition,
  word: Word
): CellPosition | null {
  const cells = getWordCells(word);
  const idx = cells.findIndex((c) => c.row === current.row && c.col === current.col);
  if (idx <= 0) return null;
  return cells[idx - 1];
}

export function isWordFullyFilled(
  word: Word,
  cellInputs: Record<string, string>,
  grid: CrosswordGrid
): boolean {
  const cells = getWordCells(word);
  return cells.every((c) => {
    const prefilled = getPrefilledLetter(grid, c.row, c.col);
    if (prefilled) return true;
    return !!cellInputs[cellKey(c.row, c.col)];
  });
}

export function getRevealedLetter(word: Word, row: number, col: number): string | null {
  const cells = getWordCells(word);
  const idx = cells.findIndex((c) => c.row === row && c.col === col);
  if (idx === -1) return null;
  return word.word[idx].toUpperCase();
}

export function isCellInWord(word: Word, row: number, col: number): boolean {
  return getWordCells(word).some((c) => c.row === row && c.col === col);
}

/**
 * Find a random unrevealed cell in a word to use as a hint.
 * Returns the cell position and the correct letter, or null if all cells are already filled.
 */
export function getHintCell(
  word: Word,
  cellInputs: Record<string, string>,
  grid: CrosswordGrid
): { row: number; col: number; letter: string } | null {
  const cells = getWordCells(word);
  const unrevealed = cells.filter((c) => {
    if (getPrefilledLetter(grid, c.row, c.col)) return false;
    const input = cellInputs[cellKey(c.row, c.col)];
    const correctLetter = word.word[cells.indexOf(c)].toUpperCase();
    return input !== correctLetter;
  });
  if (unrevealed.length === 0) return null;
  const pick = unrevealed[Math.floor(Math.random() * unrevealed.length)];
  const idx = cells.findIndex((c) => c.row === pick.row && c.col === pick.col);
  return { row: pick.row, col: pick.col, letter: word.word[idx].toUpperCase() };
}
