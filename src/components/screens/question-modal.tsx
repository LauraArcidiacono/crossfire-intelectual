import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { TimerDisplay } from '../ui/timer-display';
import { Badge } from '../ui/badge';
import { useTimer } from '../../hooks/use-timer';
import { useGameStore } from '../../store/game-store';
import { generateOptionsForQuestion } from '../../lib/data-loader';
import { TRIVIA_HINT_COST } from '../../constants/game-config';
import type { Question, Word } from '../../types/game.types';
import { calculateWordScore } from '../../constants/scrabble-values';

interface QuestionModalProps {
  question: Question;
  word: Word;
  onAnswer: (answer: string, usedHint: boolean) => void;
  onTimeout: () => void;
}

export function QuestionModal({ question, word, onAnswer, onTimeout }: QuestionModalProps) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState('');
  const [usedHint, setUsedHint] = useState(false);
  const language = useGameStore((s) => s.language);
  const currentPlayerScore = useGameStore((s) => {
    const currentTurn = s.currentTurn;
    return s.players[currentTurn === 1 ? 0 : 1].score;
  });
  const updateScore = useGameStore((s) => s.updateScore);
  const currentPlayerIndex = useGameStore((s) => (s.currentTurn === 1 ? 0 : 1)) as 0 | 1;

  const { timeRemaining } = useTimer({
    initialTime: 60,
    autoStart: true,
    onExpire: onTimeout,
  });

  const basePoints = calculateWordScore(word.word);

  // Generate options lazily for open questions (used when hint requested)
  const generatedOptions = useMemo(() => {
    if (question.type === 'open') {
      return generateOptionsForQuestion(question, language);
    }
    return null;
  }, [question, language]);

  const showAsMultipleChoice = question.type === 'multiple-choice' || usedHint;
  const options = question.type === 'multiple-choice' ? question.options : generatedOptions;

  const handleSubmit = () => {
    if (!showAsMultipleChoice && !answer.trim()) return;
    onAnswer(answer, usedHint);
  };

  const canRequestOptions = currentPlayerScore >= TRIVIA_HINT_COST;

  const handleRequestOptions = () => {
    if (!canRequestOptions) return;
    updateScore(currentPlayerIndex, -TRIVIA_HINT_COST);
    setUsedHint(true);
  };

  return (
    <Modal isOpen>
      <div className="glass-strong rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-2xl"
            >
              🧠
            </motion.span>
            <h2 className="font-title text-lg font-extrabold text-forest-green">
              {t('question.title')}
            </h2>
          </div>
          <TimerDisplay seconds={timeRemaining} variant="circular" size="sm" />
        </div>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-warm-brown/80">
            {t('question.completedWord')}: <strong className="text-forest-green font-bold">{word.word}</strong>
          </span>
          <Badge category={word.category} variant="category">{word.category}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-5 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-forest-green/15 text-forest-green font-bold">{basePoints} {t('question.basePoints')}</span>
          {!usedHint ? (
            <span className="px-2.5 py-1 rounded-full bg-terracotta text-white font-bold">{basePoints * 2} {t('question.doublePoints')}</span>
          ) : (
            <>
              <span className="px-2.5 py-1 rounded-full bg-warm-brown/20 text-warm-brown/50 font-bold line-through">{basePoints * 2}</span>
              <span className="px-2.5 py-1 rounded-full bg-terracotta/80 text-white font-bold">{Math.floor(basePoints * 1.5)} {t('question.doublePoints')}</span>
            </>
          )}
          {question.type === 'open' && !usedHint && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleRequestOptions}
              disabled={!canRequestOptions}
              className={`ml-auto px-2.5 py-1 rounded-full font-bold transition-all flex items-center gap-1
                ${canRequestOptions
                  ? 'bg-night-blue/15 text-night-blue border border-night-blue/30 cursor-pointer hover:bg-night-blue/25 active:bg-night-blue/35'
                  : 'bg-warm-brown/10 text-warm-brown/30 border border-warm-brown/10 cursor-not-allowed'
                }`}
            >
              💡 {t('question.requestOptions')} <span className="opacity-70">{t('question.requestOptionsCost')}</span>
            </motion.button>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 mb-5 border border-white/50">
          <p className="text-warm-brown font-semibold">{question.question}</p>
        </div>

        {showAsMultipleChoice ? (
          <div className="grid grid-cols-2 gap-2">
            {options?.map((option) => (
              <motion.button
                key={option}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setAnswer(option);
                  onAnswer(option, usedHint);
                }}
                className={`
                  px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer
                  ${answer === option
                    ? 'btn-gradient-green text-white shadow-md'
                    : 'bg-white/50 backdrop-blur-sm text-warm-brown border border-white/40 hover:bg-white/70'
                  }
                `}
              >
                {option}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              value={answer}
              onChange={setAnswer}
              placeholder={t('question.answerPlaceholder')}
              data-testid="answer-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && answer.trim()) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              autoFocus
            />
            <Button fullWidth onClick={handleSubmit} disabled={!answer.trim()}>
              {t('question.submitAnswer')} ↵
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
