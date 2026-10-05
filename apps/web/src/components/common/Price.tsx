import React from 'react';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PriceProps {
  amount: number;
  className?: string;
}

export const Price: React.FC<PriceProps> = ({ amount, className }) => {
  return (
    <span className={cn('font-mono font-semibold tracking-tight', className)}>
      {formatINR(amount)}
    </span>
  );
};
