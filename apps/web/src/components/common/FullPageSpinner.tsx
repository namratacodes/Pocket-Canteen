import React from 'react';
import { UtensilsCrossed } from 'lucide-react';

export const FullPageSpinner: React.FC = () => {
  return (
    <div
      data-testid="full-page-spinner"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    >
      <div className="relative flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div className="absolute h-20 w-20 rounded-full border-4 border-brand/20 animate-ping" />
        {/* Spinning border */}
        <div className="h-16 w-16 rounded-full border-4 border-muted border-t-brand animate-spin" />
        {/* Centered fork and spoon */}
        <div className="absolute flex h-10 w-10 items-center justify-center text-brand">
          <UtensilsCrossed className="h-6 w-6 animate-pulse" />
        </div>
      </div>
      <div className="mt-6 text-center">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Pocket Canteen
        </h2>
        <p className="text-xs text-muted-foreground mt-1">Starting session…</p>
      </div>
    </div>
  );
};
