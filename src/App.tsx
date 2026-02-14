import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from './store/game-store';
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
  const ScreenComponent = screens[currentScreen];

  return (
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
  );
}

export default App;
