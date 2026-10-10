import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const LABELS = ['Received', 'Preparing', 'Ready', 'Collected'];

/** step: 1-4 = that node is current, 5 = everything done. */
export function StepTracker({ step }: { step: number }) {
  return (
    <ol className="flex" aria-label="Order progress">
      {LABELS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const current = step === n;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5" aria-current={current ? 'step' : undefined}>
            {i > 0 && (
              <div className="absolute right-1/2 top-3 h-1 w-full -translate-y-1/2 bg-muted" aria-hidden>
                <div className={cn('h-full bg-primary transition-all duration-700', step >= n ? 'w-full' : 'w-0')} />
              </div>
            )}
            <span
              className={cn(
                'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors duration-700',
                done || current ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background',
                current && 'animate-pulse',
              )}
            >
              {done && <Check className="h-3.5 w-3.5" aria-hidden />}
            </span>
            <span className={cn('text-xs', done || current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}