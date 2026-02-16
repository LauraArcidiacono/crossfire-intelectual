import type { Category } from '../../types/game.types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'category' | 'turn' | 'points';
  category?: Category;
  pulse?: boolean;
}

const categoryColors: Record<Category, string> = {
  history: 'bg-warm-brown/15 text-warm-brown border border-warm-brown/20',
  language: 'bg-night-blue/15 text-night-blue border border-night-blue/20',
  science: 'bg-forest-green/15 text-forest-green border border-forest-green/20',
  philosophy: 'bg-terracotta/15 text-terracotta border border-terracotta/20',
  art: 'bg-crimson/15 text-crimson border border-crimson/20',
  geography: 'bg-sage-green/15 text-sage-green border border-sage-green/20',
};

const variantStyles: Record<string, string> = {
  category: 'text-sm px-2.5 py-0.5',
  turn: 'text-base px-3 py-1 bg-gold/20 text-gold font-bold border border-gold/30',
  points: 'text-base px-2.5 py-0.5 bg-forest-green/15 text-forest-green font-mono border border-forest-green/20',
};

export function Badge({ children, variant = 'category', category, pulse = false }: BadgeProps) {
  const colorClass = variant === 'category' && category
    ? categoryColors[category]
    : variantStyles[variant];

  const sizeClass = variant === 'category' ? 'text-sm px-2.5 py-0.5' : '';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-body backdrop-blur-sm
        ${variant === 'category' ? sizeClass : ''}
        ${colorClass}
        ${variant !== 'category' ? variantStyles[variant] : ''}
        ${pulse ? 'animate-pulse' : ''}
      `}
    >
      {children}
    </span>
  );
}
