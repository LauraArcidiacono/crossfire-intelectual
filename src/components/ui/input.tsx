import { forwardRef } from 'react';

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  className?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  'data-testid'?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    value,
    onChange,
    placeholder,
    required = false,
    maxLength,
    className = '',
    autoFocus,
    onKeyDown,
    ...props
  },
  ref
) {
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      autoFocus={autoFocus}
      className={`
        w-full px-4 py-2.5 rounded-xl font-body text-base text-warm-brown
        bg-white/80 backdrop-blur-sm border border-warm-brown/20
        placeholder:text-warm-brown/50
        focus:outline-none focus:ring-2 focus:ring-forest-green/60 focus:border-transparent
        focus:bg-white transition-all
        ${className}
      `}
      data-testid={props['data-testid']}
    />
  );
});
