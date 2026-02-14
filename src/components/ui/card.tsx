import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  selected?: boolean;
  onClick?: () => void;
  className?: string;
  'data-testid'?: string;
}

const variantStyles: Record<string, string> = {
  default: 'glass',
  elevated: 'glass-strong shadow-lg shadow-black/5',
  outlined: 'bg-white/20 backdrop-blur-sm border border-white/30',
};

export function Card({
  children,
  variant = 'default',
  selected = false,
  onClick,
  className = '',
  ...props
}: CardProps) {
  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      className={`
        rounded-2xl p-5 transition-all
        ${variantStyles[variant]}
        ${selected ? 'ring-2 ring-forest-green shadow-lg shadow-forest-green/20' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      data-testid={props['data-testid']}
    >
      {children}
    </motion.div>
  );
}
