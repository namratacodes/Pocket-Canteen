import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QtyStepperProps {
  qty: number;
  onInc: () => void;
  onDec: () => void;
  max?: number;
  className?: string;
  size?: 'sm' | 'default';
}

export const QtyStepper: React.FC<QtyStepperProps> = ({
  qty,
  onInc,
  onDec,
  max = 10,
  className,
  size = 'default',
}) => {
  const isSm = size === 'sm';

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center rounded-xl border border-brand/30 bg-brand-soft/80 shadow-sm transition-all',
        isSm ? 'h-9 px-1 gap-1' : 'h-11 px-1.5 gap-2',
        className
      )}
    >
      <button
        type="button"
        onClick={onDec}
        aria-label={qty === 1 ? 'Remove item' : 'Decrease quantity'}
        className={cn(
          'flex items-center justify-center rounded-lg text-brand-dark transition-colors hover:bg-brand/15 active:scale-95',
          isSm ? 'h-7 w-7' : 'h-8 w-8'
        )}
      >
        {qty === 1 ? (
          <Trash2 className={cn(isSm ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-danger')} />
        ) : (
          <Minus className={isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        )}
      </button>

      <span
        className={cn(
          'min-w-[1.25rem] text-center font-mono font-bold text-foreground tabular-nums select-none',
          isSm ? 'text-xs' : 'text-sm'
        )}
      >
        {qty}
      </span>

      <button
        type="button"
        onClick={onInc}
        disabled={qty >= max}
        aria-label="Increase quantity"
        className={cn(
          'flex items-center justify-center rounded-lg text-brand-dark transition-colors hover:bg-brand/15 active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
          isSm ? 'h-7 w-7' : 'h-8 w-8'
        )}
      >
        <Plus className={isSm ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  );
};
