import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { timeAgo } from '../shared/dates';
import type { AdminOverview } from '@/types/admin';
import { cn } from '@/lib/utils';

export const AlertsList: React.FC<{ alerts?: AdminOverview['alerts']; loading?: boolean }> = ({ alerts, loading }) => (
  <Card className="p-4">
    <h2 className="mb-3 text-base font-semibold">Alerts</h2>
    {loading && <Skeleton className="h-16 w-full" />}
    {!loading && (!alerts || alerts.length === 0) && (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden /> Nothing needs attention.
      </p>
    )}
    <ul className="space-y-3">
      {alerts?.map((a) => {
        const Icon = a.level === 'error' ? XCircle : AlertTriangle;
        return (
          <li key={a.id} className="flex gap-2 text-sm">
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', a.level === 'error' ? 'text-danger' : 'text-amber-600')} aria-hidden />
            <div>
              <p>{a.message}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(a.at)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  </Card>
);