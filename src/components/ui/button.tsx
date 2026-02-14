import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  'data-testid'?: string;
}

const variantStyles: Record<string, string> = {
  primary: 'btn-gradient-green text-white shadow-lg shadow-forest-green/25',
  secondary: 'btn-gradient-orange text-white shadow-lg shadow-terracotta/25',
  danger: 'bg-crimson text-white shadow-lg shadow-crimson/25',
  ghost: 'bg-white/30 backdrop-blur-sm text-warm-brown border border-white/40 hover:bg-white/50',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3.5 text-lg',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      whileHover={disabled ? undefined : { scale: 1.03 }}
      className={`
        font-title font-bold rounded-2xl transition-all cursor-pointer tracking-wide
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? '!bg-warm-brown/20 !text-warm-brown/50 !shadow-none cursor-not-allowed !bg-none' : ''}
      `}
      data-testid={props['data-testid']}
    >
      {children}
    </motion.button>
  );
}
