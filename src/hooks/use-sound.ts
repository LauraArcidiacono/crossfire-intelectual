import { useCallback, useEffect } from 'react';
import { soundManager } from '../lib/sound';
import { useGameStore } from '../store/game-store';

export function useSound() {
  const soundEnabled = useGameStore((s) => s.soundEnabled);
  const volume = useGameStore((s) => s.volume);

  useEffect(() => {
    soundManager.init();
  }, []);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    soundManager.setVolume(volume);
  }, [volume]);

  const play = useCallback((name: Parameters<typeof soundManager.play>[0]) => {
    soundManager.play(name);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.setEnabled(enabled);
  }, []);

  const setVolume = useCallback((vol: number) => {
    soundManager.setVolume(vol);
  }, []);

  return { play, setEnabled, setVolume };
}
