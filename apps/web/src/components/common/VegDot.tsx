import React from 'react';
import { cn } from '@/lib/utils';

export interface VegDotProps {
  isVeg: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VegDot: React.FC<VegDotProps> = ({
  isVeg,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5 p-0.5 border-[1.5px]',
    md: 'w-4 h-4 p-0.5 border-2',
    lg: 'w-5 h-5 p-1 border-2',
  };

  const dotClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div
      aria-label={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
      className={cn(
        'inline-flex items-center justify-center rounded-sm transition-colors',
        sizeClasses[size],
        isVeg
          ? 'border-emerald-600 bg-white dark:bg-slate-900'
          : 'border-red-600 bg-white dark:bg-slate-900',
        className
      )}
    >
      <div
        className={cn(
          'rounded-full',
          dotClasses[size],
          isVeg ? 'bg-emerald-600' : 'bg-red-600'
        )}
      />
    </div>
  );
};
