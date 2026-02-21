import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/game-store';
import { useSound } from './hooks/use-sound';
import { WelcomeScreen } from './components/screens/welcome-screen';
import { Spinner } from './components/ui/spinner';

const TutorialScreen = lazy(() => import('./components/screens/tutorial-screen').then(m => ({ default: m.TutorialScreen })));
const ConfigScreen = lazy(() => import('./components/screens/config-screen').then(m => ({ default: m.ConfigScreen })));
const WaitingRoomScreen = lazy(() => import('./components/screens/waiting-room-screen').then(m => ({ default: m.WaitingRoomScreen })));
const GameScreen = lazy(() => import('./components/screens/game-screen').then(m => ({ default: m.GameScreen })));
const VictoryScreen = lazy(() => import('./components/screens/victory-screen').then(m => ({ default: m.VictoryScreen })));

const screens = {
  welcome: WelcomeScreen,
  tutorial: TutorialScreen,
  config: ConfigScreen,
  'waiting-room': WaitingRoomScreen,
  game: GameScreen,
  victory: VictoryScreen,
} as const;

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-mesh-vibrant flex items-center justify-center">
      <Spinner size="md" />
    </div>
  );
}

function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);
  const status = useGameStore((state) => state.status);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const setSoundEnabled = useGameStore((state) => state.setSoundEnabled);
  const { playMusic, stopMusic } = useSound();
  const ScreenComponent = screens[currentScreen];
  const screensWithMusic = currentScreen === 'game' || currentScreen === 'victory';
  const desiredMusic = currentScreen === 'victory' ? 'music-victory' as const : 'music-game' as const;

  // Warn before leaving when game is active
  useEffect(() => {
    const isGameActive = status === 'playing' && (currentScreen === 'game' || currentScreen === 'waiting-room');
    if (!isGameActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [status, currentScreen]);

  // Play/stop music based on screen and sound toggle
  useEffect(() => {
    if (soundEnabled && screensWithMusic) {
      playMusic(desiredMusic);
    } else {
      stopMusic();
    }
  }, [currentScreen, soundEnabled, screensWithMusic, desiredMusic, playMusic, stopMusic]);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentScreen}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ScreenComponent />
          </Suspense>
        </motion.div>
      </AnimatePresence>

      {/* Sound toggle - only on screens with music */}
      {screensWithMusic && (
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="fixed bottom-5 right-5 z-50 w-12 h-12 rounded-full glass-strong shadow-lg flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform"
          aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      )}
    </>
  );
}

export default App;
