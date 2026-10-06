import React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { cn } from '@/lib/utils';

export interface AnalyticsCardProps<T> {
  title: string;
  subtitle?: string;
  query: UseQueryResult<T, Error>;
  /** Heading of the error state, e.g. "Forecast unavailable. ML service offline" */
  errorTitle: string;
  emptyText?: string;
  isEmpty?: (data: T) => boolean;
  action?: React.ReactNode;
  className?: string;
  id?: string;
  children: (data: T) => React.ReactNode;
}

// Every analytics card owns its loading / error / empty state, so one failure never breaks the page.
export function AnalyticsCard<T>({
  title, subtitle, query, errorTitle, emptyText = 'Not enough data yet. Check back after more orders.',
  isEmpty, action, className, id, children,
}: AnalyticsCardProps<T>) {
  let body: React.ReactNode;
  if (query.isLoading) {
    body = (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  } else if (query.isError) {
    body = <ErrorState title={errorTitle} error={query.error} onRetry={() => query.refetch()} className="min-h-[200px]" />;
  } else if (query.data === undefined || (isEmpty && isEmpty(query.data))) {
    body = <EmptyState icon={BarChart3} title="No data yet" description={emptyText} className="min-h-[200px]" />;
  } else {
    body = children(query.data);
  }

  return (
    <Card id={id} className={cn('space-y-3 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {body}
    </Card>
  );
}