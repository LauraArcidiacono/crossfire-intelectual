import { TIMER_THRESHOLDS } from '../../constants/game-config';

interface TimerDisplayProps {
  seconds: number;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
}

function getTimerColor(seconds: number): string {
  if (seconds >= TIMER_THRESHOLDS.green.min) return 'text-forest-green';
  if (seconds >= TIMER_THRESHOLDS.yellow.min) return 'text-terracotta';
  return 'text-crimson';
}

function getTimerBgColor(seconds: number): string {
  if (seconds >= TIMER_THRESHOLDS.green.min) return 'bg-forest-green';
  if (seconds >= TIMER_THRESHOLDS.yellow.min) return 'bg-terracotta';
  return 'bg-crimson';
}

function getTimerStrokeColor(seconds: number): string {
  if (seconds >= TIMER_THRESHOLDS.green.min) return '#589C48';
  if (seconds >= TIMER_THRESHOLDS.yellow.min) return '#F58024';
  return '#DC143C';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const sizeStyles: Record<string, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export function TimerDisplay({ seconds, variant = 'linear', size = 'md' }: TimerDisplayProps) {
  const isRedZone = seconds < TIMER_THRESHOLDS.yellow.min;

  if (variant === 'circular') {
    const radius = size === 'lg' ? 40 : size === 'md' ? 30 : 20;
    const circumference = 2 * Math.PI * radius;
    const maxTime = 60;
    const progress = Math.max(0, seconds / maxTime);
    const offset = circumference * (1 - progress);
    const strokeColor = getTimerStrokeColor(seconds);

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={(radius + 6) * 2} height={(radius + 6) * 2} className="-rotate-90">
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={radius}
            fill="none"
            stroke="rgba(58, 58, 58, 0.1)"
            strokeWidth="4"
          />
          <circle
            cx={radius + 6}
            cy={radius + 6}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span
          className={`absolute font-mono font-bold ${sizeStyles[size]} ${getTimerColor(seconds)} ${isRedZone ? 'animate-pulse' : ''}`}
        >
          {seconds}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-mono font-bold ${sizeStyles[size]} ${getTimerColor(seconds)} ${isRedZone ? 'animate-pulse' : ''}`}
      >
        {formatTime(seconds)}
      </span>
      <div className="w-20 h-2 bg-warm-brown/10 rounded-full overflow-hidden backdrop-blur-sm">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${getTimerBgColor(seconds)}`}
          style={{ width: `${Math.max(0, (seconds / 180) * 100)}%` }}
        />
      </div>
    </div>
  );
}
