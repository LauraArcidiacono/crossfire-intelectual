import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMER_THRESHOLDS } from '../constants/game-config';

interface UseTimerOptions {
  initialTime: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

export function useTimer({ initialTime, onExpire, autoStart = false }: UseTimerOptions) {
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

  const timerColor = timeRemaining >= TIMER_THRESHOLDS.green.min
    ? 'green'
    : timeRemaining >= TIMER_THRESHOLDS.yellow.min
      ? 'yellow'
      : 'red';

  return { timeRemaining, isRunning, isPaused, start, pause, resume, reset, timerColor };
}
