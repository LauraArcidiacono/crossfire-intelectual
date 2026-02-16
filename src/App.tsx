import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/game-store';
import { useSound } from './hooks/use-sound';
import { WelcomeScreen } from './components/screens/welcome-screen';
import { TutorialScreen } from './components/screens/tutorial-screen';
import { ConfigScreen } from './components/screens/config-screen';
import { WaitingRoomScreen } from './components/screens/waiting-room-screen';
import { GameScreen } from './components/screens/game-screen';
import { VictoryScreen } from './components/screens/victory-screen';

const screens = {
  welcome: WelcomeScreen,
  tutorial: TutorialScreen,
  config: ConfigScreen,
  'waiting-room': WaitingRoomScreen,
  game: GameScreen,
  victory: VictoryScreen,
} as const;

function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const setSoundEnabled = useGameStore((state) => state.setSoundEnabled);
  const { playMusic, stopMusic } = useSound();
  const ScreenComponent = screens[currentScreen];
  const screensWithMusic = currentScreen === 'game' || currentScreen === 'victory';
  const desiredMusic = currentScreen === 'victory' ? 'music-victory' as const : 'music-game' as const;

  // Play/stop music based on screen and sound toggle
  useEffect(() => {
    if (soundEnabled && screensWithMusic) {
      playMusic(desiredMusic);
    } else {
      stopMusic();
    }
  }, [currentScreen, soundEnabled]);

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
          <ScreenComponent />
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
