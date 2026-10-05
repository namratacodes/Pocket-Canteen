import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ErrorStateProps {
  title?: string;
  error?: Error | { message?: string } | null;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  error,
  onRetry,
  className,
}) => {
  const message =
    error && typeof error === 'object' && 'message' in error && error.message
      ? error.message
      : 'An unexpected error occurred. Please check your connection and try again.';

  return (
    <div
      className={cn(
        'flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-4 gap-2 border-destructive/30 hover:bg-destructive/10"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
};
