import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { ArrowLeftRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import type { SettlementRow } from '@/types/admin';
import { selectClass } from '../shared/styles';
import { computeTransfers } from './computeTransfers';
import { ConservationCheck } from './ConservationCheck';
import { downloadSettlementsCsv } from './exportCsv';
import { SettlementDrawer } from './SettlementDrawer';
import { SettlementTable } from './SettlementTable';
import { TransfersList } from './TransfersList';

interface PendingSettle {
  title: string;
  description: string;
  ids: string[];
}

function periodOptions(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = subMonths(now, i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
  });
}

export const SettlementsPage: React.FC = () => {
  const qc = useQueryClient();
  const options = useMemo(periodOptions, []);
  // Default to last month: the most recent period that is complete.
  const [period, setPeriod] = useState(options[1].value);
  const [drawerRow, setDrawerRow] = useState<SettlementRow | null>(null);
  const [pendingSettle, setPendingSettle] = useState<PendingSettle | null>(null);

  const query = useQuery({
    queryKey: queryKeys.admin.settlements(period),
    queryFn: () => adminApi.settlements(period),
  });

  const settle = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) await adminApi.settle(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'settlements'] });
      qc.invalidateQueries({ queryKey: queryKeys.admin.overview });
      toast.success('Marked as settled');
      setPendingSettle(null);
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't mark as settled. Try again."),
  });

  const report = query.data;
  const transfers = report ? report.transfers ?? computeTransfers(report.rows) : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settlements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Wallet refunds can be spent at any canteen, so canteens owe each other money every month.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Settlement period"
            className={`${selectClass} !w-48`}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <Button
            variant="outline"
            className="gap-2"
            disabled={!report || report.rows.length === 0}
            onClick={() => report && downloadSettlementsCsv(report.period, report.rows)}
          >
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </Button>
        </div>
      </div>

      {query.isLoading && <SkeletonCard lines={6} />}
      {query.isError && <ErrorState title="Couldn't load settlements" error={query.error} onRetry={() => query.refetch()} />}
      {report && report.rows.length === 0 && (
        <EmptyState
          icon={ArrowLeftRight}
          title="No settlement activity"
          description="No wallet credit was issued or redeemed in this period yet."
        />
      )}
      {report && report.rows.length > 0 && (
        <>
          <SettlementTable
            rows={report.rows}
            onOpen={setDrawerRow}
            onSettle={(r) =>
              setPendingSettle({
                title: `Mark ${r.canteenName} as settled?`,
                description: 'Confirm only after the transfer has actually been made. This records you as the person who settled it.',
                ids: [r.id],
              })
            }
          />
          <ConservationCheck report={report} />
          <TransfersList
            transfers={transfers}
            rows={report.rows}
            floatingCredit={report.floatingCredit}
            onSettleBoth={(t, pending) =>
              setPendingSettle({
                title: `Mark ${t.from} and ${t.to} as settled?`,
                description: 'Confirm only after the transfer has actually been made.',
                ids: pending.map((p) => p.id),
              })
            }
          />
        </>
      )}

      <SettlementDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />

      <ConfirmDialog
        open={!!pendingSettle}
        onOpenChange={(open) => {
          if (!open) setPendingSettle(null);
        }}
        title={pendingSettle?.title ?? ''}
        description={pendingSettle?.description ?? ''}
        confirmText="Mark settled"
        loading={settle.isPending}
        onConfirm={() => pendingSettle && settle.mutate(pendingSettle.ids)}
      />
    </div>
  );
};