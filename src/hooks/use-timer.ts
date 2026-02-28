import { useCallback, useEffect, useRef, useState } from 'react';
import { TURN_TIMER_THRESHOLDS } from '../constants/game-config';

type TimerThresholds = {
  green: { min: number; max: number };
  yellow: { min: number; max: number };
  red: { min: number; max: number };
};

interface UseTimerOptions {
  initialTime: number;
  onExpire?: () => void;
  autoStart?: boolean;
  thresholds?: TimerThresholds;
}

export function useTimer({ initialTime, onExpire, autoStart = false, thresholds = TURN_TIMER_THRESHOLDS }: UseTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isPaused, setIsPaused] = useState(false);

  const lastTickRef = useRef<number>(Date.now());
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!isRunning || isPaused) return;

    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = Math.floor((now - lastTickRef.current) / 1000);
      if (delta >= 1) {
        lastTickRef.current = now;
        setTimeRemaining((prev) => {
          const next = Math.max(0, prev - delta);
          if (next <= 0) {
            setIsRunning(false);
            onExpireRef.current?.();
          }
          return next;
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const start = useCallback(() => {
    lastTickRef.current = Date.now();
    setIsRunning(true);
    setIsPaused(false);
  }, []);

  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    lastTickRef.current = Date.now();
    setIsPaused(false);
  }, []);

  const reset = useCallback((newTime?: number) => {
    setTimeRemaining(newTime ?? initialTime);
    setIsRunning(false);
    setIsPaused(false);
  }, [initialTime]);

  const timerColor = timeRemaining >= thresholds.green.min
    ? 'green'
    : timeRemaining >= thresholds.yellow.min
      ? 'yellow'
      : 'red';

  return { timeRemaining, isRunning, isPaused, start, pause, resume, reset, timerColor };
}
