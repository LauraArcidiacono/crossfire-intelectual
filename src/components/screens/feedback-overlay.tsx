import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Confetti } from '../ui/confetti';
import type { LastFeedback } from '../../types/game.types';

interface FeedbackOverlayProps {
  feedback: LastFeedback;
}

export function FeedbackOverlay({ feedback }: FeedbackOverlayProps) {
  const { t } = useTranslation();

  return (
    <>
      <Confetti trigger={feedback.isCorrect} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center"
      >
        <div
          className={`absolute inset-0 backdrop-blur-sm ${
            feedback.isCorrect ? 'bg-forest-green/15' : 'bg-crimson/15'
          }`}
        />
        <motion.div
          initial={feedback.isCorrect ? { scale: 0.5 } : { x: -10 }}
          animate={
            feedback.isCorrect
              ? { scale: 1 }
              : { x: [0, -10, 10, -10, 10, 0] }
          }
          transition={
            feedback.isCorrect
              ? { type: 'spring', damping: 15 }
              : { duration: 0.5 }
          }
          className="relative z-10 glass-strong rounded-3xl p-8 shadow-2xl text-center max-w-sm mx-4"
        >
          <motion.div
            animate={feedback.isCorrect ? { scale: [1, 1.2, 1] } : { rotate: [0, -10, 10, -10, 0] }}
            transition={{ duration: 0.6 }}
            className="text-5xl mb-4"
          >
            {feedback.isCorrect ? '✅' : '❌'}
          </motion.div>

          <h2
            className={`font-title text-2xl font-extrabold mb-3 ${
              feedback.isCorrect ? 'text-forest-green' : 'text-crimson'
            }`}
          >
            {feedback.isCorrect ? t('feedback.correct') : t('feedback.incorrect')}
          </h2>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-lg font-mono font-extrabold ${
              feedback.isCorrect
                ? 'bg-forest-green/15 text-forest-green'
                : 'bg-crimson/15 text-crimson'
            }`}
          >
            +{feedback.pointsEarned} {t('feedback.pointsEarned')}
          </motion.div>

          {feedback.correctAnswer && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-4 text-base text-warm-brown"
            >
              {t('feedback.theAnswerWas')}: <strong className="text-forest-green">{feedback.correctAnswer}</strong>
            </motion.p>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}
