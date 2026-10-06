import React from 'react';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';

// Δ colours: green = receives, red = pays, grey = zero. The words carry the meaning too.
export const DeltaAmount: React.FC<{ value: number }> = ({ value }) => {
  if (Math.abs(value) < 0.005) {
    return <span className="font-mono tabular-nums text-muted-foreground">{formatINR(0)}</span>;
  }
  const positive = value > 0;
  return (
    <span className={cn('font-mono font-semibold tabular-nums', positive ? 'text-success' : 'text-danger')}>
      {positive ? '+' : '−'}
      {formatINR(Math.abs(value))}
      <span className="ml-1.5 font-sans text-xs font-medium">{positive ? 'receives' : 'pays'}</span>
    </span>
  );
};