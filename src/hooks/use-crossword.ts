import { useCallback, useMemo } from 'react';
import { useGameStore } from '../store/game-store';
import type { Word } from '../types/game.types';
import {
  buildWordInput,
  cellKey,
  getNextCell,
  getPreviousCell,
  getPrefilledLetter,
  getWordCells,
  getWordsAtCell,
  isBlackCell,
  isWordFullyFilled,
} from '../lib/crossword';
import { validateWord } from '../lib/game-logic';

export type CellState = 'black' | 'empty' | 'prefilled' | 'input' | 'selected' | 'completed';

export function useCrossword() {
  const crossword = useGameStore((s) => s.crossword);
  const selectedWordId = useGameStore((s) => s.selectedWordId);
  const cellInputs = useGameStore((s) => s.cellInputs);
  const completedWords = useGameStore((s) => s.completedWords);
  const selectWord = useGameStore((s) => s.selectWord);
  const setCellInput = useGameStore((s) => s.setCellInput);
  const setSelectedCell = useGameStore((s) => s.setSelectedCell);

  const selectedWord = useMemo(() => {
    if (!crossword || selectedWordId === null) return null;
    return crossword.words.find((w) => w.id === selectedWordId) ?? null;
  }, [crossword, selectedWordId]);

  const completedCells = useMemo(() => {
    if (!crossword) return new Set<string>();
    const cells = new Set<string>();
    for (const wordId of completedWords) {
      const word = crossword.words.find((w) => w.id === wordId);
      if (word) {
        getWordCells(word).forEach((c) => cells.add(cellKey(c.row, c.col)));
      }
    }
    return cells;
  }, [crossword, completedWords]);

  const selectedWordCells = useMemo(() => {
    if (!selectedWord) return new Set<string>();
    return new Set(getWordCells(selectedWord).map((c) => cellKey(c.row, c.col)));
  }, [selectedWord]);

  const allWordCells = useMemo(() => {
    if (!crossword) return new Set<string>();
    const cells = new Set<string>();
    for (const word of crossword.words) {
      getWordCells(word).forEach((c) => cells.add(cellKey(c.row, c.col)));
    }
    return cells;
  }, [crossword]);

  const getCellState = useCallback(
    (row: number, col: number): CellState => {
      if (!crossword) return 'empty';
      if (isBlackCell(crossword.grid, row, col)) return 'black';
      const key = cellKey(row, col);
      if (!allWordCells.has(key)) return 'black';
      if (completedCells.has(key)) return 'completed';
      if (selectedWordCells.has(key)) return 'selected';
      if (getPrefilledLetter(crossword.grid, row, col)) return 'prefilled';
      if (cellInputs[key]) return 'input';
      return 'empty';
    },
    [crossword, allWordCells, completedCells, selectedWordCells, cellInputs]
  );

  const availableWords = useMemo(() => {
    if (!crossword) return [];
    return crossword.words.filter((w) => !completedWords.includes(w.id));
  }, [crossword, completedWords]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!crossword) return;
      if (isBlackCell(crossword.grid, row, col)) return;

      const wordsAtCell = getWordsAtCell(crossword, row, col);
      const available = wordsAtCell.filter((w) => !completedWords.includes(w.id));
      if (available.length === 0) return;

      if (selectedWord && available.length > 1 && available.some((w) => w.id === selectedWord.id)) {
        const other = available.find((w) => w.id !== selectedWord.id);
        if (other) {
          selectWord(other.id);
          setSelectedCell({ row, col });
          return;
        }
      }

      selectWord(available[0].id);
      setSelectedCell({ row, col });
    },
    [crossword, selectedWord, completedWords, selectWord, setSelectedCell]
  );

  const handleClueClick = useCallback(
    (wordId: number) => {
      if (!crossword) return;
      if (completedWords.includes(wordId)) return;
      const word = crossword.words.find((w) => w.id === wordId);
      if (word) {
        selectWord(word.id);
        setSelectedCell({ row: word.row, col: word.col });
      }
    },
    [crossword, completedWords, selectWord, setSelectedCell]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent | KeyboardEvent) => {
      if (!crossword) return;

      // Read fresh state from store to avoid stale closures on rapid mobile input
      const currentState = useGameStore.getState();
      const cell = currentState.selectedCell;
      const inputs = currentState.cellInputs;
      const wordId = currentState.selectedWordId;
      if (!cell || wordId === null) return;

      const word = crossword.words.find((w) => w.id === wordId);
      if (!word) return;

      const grid = crossword.grid;

      if (e.key === 'Backspace') {
        e.preventDefault();
        const key = cellKey(cell.row, cell.col);
        if (inputs[key]) {
          setCellInput(key, '');
        } else {
          const prev = getPreviousCell(cell, word);
          if (prev) {
            setSelectedCell(prev);
            const prevKey = cellKey(prev.row, prev.col);
            if (!getPrefilledLetter(grid, prev.row, prev.col)) {
              setCellInput(prevKey, '');
            }
          }
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const currentIdx = availableWords.findIndex((w) => w.id === word.id);
        if (currentIdx !== -1 && availableWords.length > 1) {
          const nextIdx = (currentIdx + 1) % availableWords.length;
          const nextWord = availableWords[nextIdx];
          selectWord(nextWord.id);
          setSelectedCell({ row: nextWord.row, col: nextWord.col });
        }
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const cells = getWordCells(word);
        const idx = cells.findIndex((c) => c.row === cell.row && c.col === cell.col);
        if (idx === -1) return;

        let newIdx = idx;
        if ((e.key === 'ArrowRight' && word.direction === 'across') ||
            (e.key === 'ArrowDown' && word.direction === 'down')) {
          newIdx = Math.min(idx + 1, cells.length - 1);
        } else if ((e.key === 'ArrowLeft' && word.direction === 'across') ||
                   (e.key === 'ArrowUp' && word.direction === 'down')) {
          newIdx = Math.max(idx - 1, 0);
        }
        if (newIdx !== idx) {
          setSelectedCell(cells[newIdx]);
        }
        return;
      }

      if (/^[a-zA-ZñÑ]$/.test(e.key)) {
        e.preventDefault();
        const prefilled = getPrefilledLetter(grid, cell.row, cell.col);
        if (prefilled) {
          const next = getNextCell(cell, word.direction, word);
          if (next) setSelectedCell(next);
          return;
        }

        setCellInput(cellKey(cell.row, cell.col), e.key);
        const next = getNextCell(cell, word.direction, word);
        if (next) {
          setSelectedCell(next);
        }
      }
    },
    [crossword, availableWords, setCellInput, setSelectedCell, selectWord]
  );

  const handleSubmitWord = useCallback((): { isValid: boolean; word: Word } | null => {
    if (!crossword || !selectedWord) return null;
    if (!isWordFullyFilled(selectedWord, cellInputs, crossword.grid)) return null;

    const input = buildWordInput(selectedWord, cellInputs, crossword.grid);
    const isValid = validateWord(selectedWord, input);
    return { isValid, word: selectedWord };
  }, [crossword, selectedWord, cellInputs]);

  const isCurrentWordFilled = useMemo(() => {
    if (!crossword || !selectedWord) return false;
    return isWordFullyFilled(selectedWord, cellInputs, crossword.grid);
  }, [crossword, selectedWord, cellInputs]);

  return {
    getCellState,
    selectedWord,
    handleCellClick,
    handleClueClick,
    handleKeyDown,
    handleSubmitWord,
    availableWords,
    completedCells,
    isCurrentWordFilled,
  };
}
