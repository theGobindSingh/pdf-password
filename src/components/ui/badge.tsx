import { type HTMLAttributes } from 'react';

type Variant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary/20 text-primary border-primary/30',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  destructive: 'bg-destructive/20 text-destructive border-destructive/30',
  outline: 'bg-transparent text-foreground border-border',
};

export const Badge = ({
  variant = 'default',
  className = '',
  children,
  ...props
}: BadgeProps) => (
  <span
    className={[
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
      variantClasses[variant],
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </span>
);
