import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import { OpenBadge } from '../shared/StatusPill';
import { AlertsList } from './AlertsList';
import { KpiCards } from './KpiCards';

const REFRESH_MS = 30_000;

export const AdminOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const overview = useQuery({
    queryKey: queryKeys.admin.overview,
    queryFn: () => adminApi.overview(),
    refetchInterval: REFRESH_MS,
  });
  const canteens = useQuery({
    queryKey: queryKeys.admin.canteens,
    queryFn: () => adminApi.canteens(),
    refetchInterval: REFRESH_MS,
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Today across every canteen. Updates every 30 seconds.</p>
      </div>

      <KpiCards query={overview} />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="p-4">
          <h2 className="mb-3 text-base font-semibold">Canteens live</h2>
          {canteens.isLoading && <Skeleton className="h-32 w-full" />}
          {canteens.isError && (
            <ErrorState title="Couldn't load canteens" error={canteens.error} onRetry={() => canteens.refetch()} className="min-h-[140px]" />
          )}
          {canteens.isSuccess && (
            <ul className="divide-y divide-border">
              {canteens.data.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/canteens/${c.id}`)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="flex items-center gap-4">
                      <OpenBadge isOpen={c.isOpen} />
                      <span className="w-24 text-right tabular-nums text-muted-foreground">{c.stats.activeOrders} active</span>
                      <span className="w-24 text-right tabular-nums">{c.stats.ordersToday.toLocaleString('en-IN')} today</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <AlertsList alerts={overview.data?.alerts} loading={overview.isLoading} />
      </div>
    </div>
  );
};