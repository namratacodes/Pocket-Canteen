import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { Price } from '@/components/common/Price';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import { formatDate } from '../shared/dates';
import type { SettlementRow } from '@/types/admin';
import { StatusPill } from '../shared/StatusPill';

export interface SettlementDrawerProps {
  row: SettlementRow | null;
  onClose: () => void;
}

export const SettlementDrawer: React.FC<SettlementDrawerProps> = ({ row, onClose }) => {
  const query = useQuery({
    queryKey: queryKeys.admin.settlementEntries(row?.id ?? ''),
    queryFn: () => adminApi.settlementEntries(row!.id),
    enabled: !!row,
  });

  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{row?.canteenName}: entries</SheetTitle>
          <SheetDescription>
            Issued is a refund credited to a student's wallet for an order paid to this canteen. Redeemed is wallet
            money spent on food this canteen cooked.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          {query.isLoading && <Skeleton className="h-40 w-full" />}
          {query.isError && <ErrorState title="Couldn't load entries" error={query.error} onRetry={() => query.refetch()} className="min-h-[160px]" />}
          {query.isSuccess && query.data.length === 0 && (
            <EmptyState icon={Receipt} title="No entries" description="Nothing was issued or redeemed for this canteen in this period." />
          )}
          {query.isSuccess && query.data.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">Order</th>
                  <th className="py-2 pr-2 font-medium">Type</th>
                  <th className="py-2 pr-2 text-right font-medium">Amount</th>
                  <th className="py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((e) => (
                  <tr key={`${e.orderUid}-${e.type}`} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2">
                      <p className="font-mono text-xs">{e.orderUid}</p>
                      <p className="text-xs text-muted-foreground">{e.studentMasked}</p>
                    </td>
                    <td className="py-2 pr-2">
                      <StatusPill tone={e.type === 'issued' ? 'info' : 'success'}>
                        {e.type === 'issued' ? 'Issued' : 'Redeemed'}
                      </StatusPill>
                    </td>
                    <td className="py-2 pr-2 text-right"><Price amount={e.amount} /></td>
                    <td className="py-2 text-muted-foreground">{formatDate(e.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};