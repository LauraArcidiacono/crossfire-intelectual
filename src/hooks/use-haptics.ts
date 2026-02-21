import { useCallback } from 'react';

type HapticPattern = 'success' | 'error' | 'tap' | 'countdown';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  success: 30,
  error: [20, 30, 20],
  tap: 10,
  countdown: 15,
};

export function useHaptics() {
  const vibrate = useCallback((pattern: HapticPattern) => {
    if (!('vibrate' in navigator)) return;
    navigator.vibrate(PATTERNS[pattern]);
  }, []);

  return { vibrate };
}
