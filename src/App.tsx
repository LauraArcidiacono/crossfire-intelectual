import { useGameStore } from './store/game-store';
import { WelcomeScreen } from './components/screens/welcome-screen';
import { TutorialScreen } from './components/screens/tutorial-screen';
import { ConfigScreen } from './components/screens/config-screen';
import { WaitingRoomScreen } from './components/screens/waiting-room-screen';
import { GameScreen } from './components/screens/game-screen';
import { VictoryScreen } from './components/screens/victory-screen';

function App() {
  const currentScreen = useGameStore((state) => state.currentScreen);

  const screens = {
    welcome: WelcomeScreen,
    tutorial: TutorialScreen,
    config: ConfigScreen,
    'waiting-room': WaitingRoomScreen,
    game: GameScreen,
    victory: VictoryScreen,
  } as const;

  const ScreenComponent = screens[currentScreen];

  return <ScreenComponent />;
}

export default App;
