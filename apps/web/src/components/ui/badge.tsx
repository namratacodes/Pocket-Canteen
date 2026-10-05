import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-brand text-white shadow hover:bg-brand-dark',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-danger text-white shadow hover:bg-red-700',
        outline: 'text-foreground',
        info: 'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
        warning:
          'border-amber-200 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
        success:
          'border-green-200 bg-green-50 text-green-800 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800',
        slate:
          'border-slate-200 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
