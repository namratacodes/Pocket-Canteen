import React from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { Price } from '@/components/common/Price';
import type { Kpis } from '@/types/admin';

export const KpiCard: React.FC<{ query: UseQueryResult<Kpis, Error> }> = ({ query }) => {
  if (query.isError) {
    return <ErrorState title="Summary numbers unavailable" error={query.error} onRetry={() => query.refetch()} className="min-h-[110px]" />;
  }
  const k = query.data;
  const items: { label: string; value: React.ReactNode }[] = [
    { label: 'Orders', value: k?.orders.toLocaleString('en-IN') },
    { label: 'Revenue', value: k && <Price amount={k.revenue} /> },
    { label: 'Avg prep time', value: k && `${k.avgPrepMins.toFixed(1)} min` },
    { label: 'Cancel rate', value: k && `${k.cancelRate.toFixed(1)}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4">
          <p className="text-sm text-muted-foreground">{it.label}</p>
          {query.isLoading ? <Skeleton className="mt-2 h-8 w-20" /> : <p className="mt-1 text-2xl font-bold tabular-nums">{it.value}</p>}
        </Card>
      ))}
    </div>
  );
};