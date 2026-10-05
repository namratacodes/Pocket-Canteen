import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center animate-in fade-in-50',
        className
      )}
    >
      {Icon && (
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-4">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
