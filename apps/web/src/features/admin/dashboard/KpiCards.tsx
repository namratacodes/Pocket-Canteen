import React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Price } from '@/components/common/Price';
import type { AdminOverview } from '@/types/admin';

export const KpiCards: React.FC<{ query: UseQueryResult<AdminOverview, Error> }> = ({ query }) => {
  if (query.isError) {
    return <ErrorState title="Couldn't load the overview" error={query.error} onRetry={() => query.refetch()} className="min-h-[120px]" />;
  }
  const o = query.data;
  const items: { label: string; value: React.ReactNode }[] = [
    { label: 'Active canteens', value: o?.activeCanteens },
    { label: 'Orders today', value: o?.ordersToday.toLocaleString('en-IN') },
    { label: 'GMV today', value: o && <Price amount={o.gmvToday} /> },
    { label: 'Floating credit', value: o && <Price amount={o.floatingCredit} /> },
    { label: 'Pending settlements', value: o?.pendingSettlements },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      {items.map((it) => (
        <Card key={it.label} className="p-4">
          <p className="text-sm text-muted-foreground">{it.label}</p>
          {query.isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <p className="mt-1 text-2xl font-bold tabular-nums">{it.value}</p>
          )}
        </Card>
      ))}
    </div>
  );
};