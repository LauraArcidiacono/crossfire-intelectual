interface SpinnerProps {
  size?: 'sm' | 'md';
}

export function Spinner({ size = 'sm' }: SpinnerProps) {
  const sizeClass = size === 'sm' ? 'w-4 h-4 border-2' : 'w-6 h-6 border-[3px]';

  return (
    <span
      className={`inline-block ${sizeClass} border-current border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
