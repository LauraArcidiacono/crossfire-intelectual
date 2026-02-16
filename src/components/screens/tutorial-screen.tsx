import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/game-store';
import { Button } from '../ui/button';

const STEP_ICONS = ['✏️', '❓', '✨', '🏆'];
const STEP_COLORS = [
  'from-forest-green/20 to-sage-green/10',
  'from-night-blue/20 to-light-purple/10',
  'from-gold/20 to-terracotta/10',
  'from-forest-green/20 to-gold/10',
];

const MULTI_ICONS = ['🏠', '🔗', '🎮'];
const MULTI_COLORS = [
  'from-night-blue/20 to-light-purple/10',
  'from-terracotta/20 to-gold/10',
  'from-forest-green/20 to-night-blue/10',
];

export function TutorialScreen() {
  const { t } = useTranslation();
  const setScreen = useGameStore((s) => s.setScreen);

  const steps = [
    { title: t('tutorial.step1Title'), desc: t('tutorial.step1Desc') },
    { title: t('tutorial.step2Title'), desc: t('tutorial.step2Desc') },
    { title: t('tutorial.step3Title'), desc: t('tutorial.step3Desc') },
    { title: t('tutorial.step4Title'), desc: t('tutorial.step4Desc') },
  ];

  const multiSteps = [
    { title: t('tutorial.multi1Title'), desc: t('tutorial.multi1Desc') },
    { title: t('tutorial.multi2Title'), desc: t('tutorial.multi2Desc') },
    { title: t('tutorial.multi3Title'), desc: t('tutorial.multi3Desc') },
  ];

  const handleStart = () => {
    localStorage.setItem('crossfire-tutorial-seen', 'true');
    setScreen('config');
  };

  return (
    <div
      data-testid="tutorial-screen"
      className="min-h-screen bg-mesh-green relative overflow-auto flex flex-col items-center px-6 py-10"
    >
      <div className="blob blob-green w-60 h-60 -top-16 -right-16" style={{ animationDelay: '-5s' }} />
      <div className="blob blob-purple w-48 h-48 bottom-10 -left-16" style={{ animationDelay: '-12s' }} />

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-title text-3xl font-extrabold text-forest-green mb-8 relative z-10"
      >
        {t('welcome.tutorial')}
      </motion.h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8 relative z-10">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            className={`glass-strong rounded-2xl p-5 bg-gradient-to-br ${STEP_COLORS[i]}`}
          >
            <div className="text-3xl mb-2">{STEP_ICONS[i]}</div>
            <h3 className="font-title text-base font-bold text-warm-brown mb-1">
              {step.title}
            </h3>
            <p className="text-base text-warm-brown/80">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Multiplayer section */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="font-title text-2xl font-extrabold text-night-blue mb-5 relative z-10"
      >
        {t('tutorial.multiTitle')}
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg mb-8 relative z-10">
        {multiSteps.map((step, i) => (
          <motion.div
            key={`multi-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.15 }}
            className={`glass-strong rounded-2xl p-5 bg-gradient-to-br ${MULTI_COLORS[i]}`}
          >
            <div className="text-3xl mb-2">{MULTI_ICONS[i]}</div>
            <h3 className="font-title text-base font-bold text-warm-brown mb-1">
              {step.title}
            </h3>
            <p className="text-base text-warm-brown/80">{step.desc}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3 relative z-10">
        <Button variant="ghost" onClick={() => setScreen('welcome')}>
          {t('tutorial.seeExample')}
        </Button>
        <Button variant="primary" onClick={handleStart}>
          {t('tutorial.gotIt')}
        </Button>
      </div>
    </div>
  );
}
