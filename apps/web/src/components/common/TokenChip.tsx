import React from 'react';
import { cn } from '@/lib/utils';

export interface TokenChipProps {
  token: string;
  size?: 'sm' | 'lg' | 'xl';
  className?: string;
}

export const TokenChip: React.FC<TokenChipProps> = ({
  token,
  size = 'sm',
  className,
}) => {
  const sizeClasses = {
    sm: 'text-sm font-semibold px-2.5 py-0.5 rounded-lg border',
    lg: 'text-2xl font-bold px-4 py-1.5 rounded-xl border-2 tracking-wide',
    xl: 'text-4xl font-extrabold px-6 py-3 rounded-2xl border-2 tracking-wider shadow-sm',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center font-mono bg-muted/40 border-border text-foreground transition-all select-all',
        sizeClasses[size],
        className
      )}
    >
      {token}
    </div>
  );
};
