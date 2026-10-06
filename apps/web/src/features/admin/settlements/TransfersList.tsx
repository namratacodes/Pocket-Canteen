import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Price } from '@/components/common/Price';
import type { SettlementRow, SettlementTransfer } from '@/types/admin';

export interface TransfersListProps {
  transfers: SettlementTransfer[];
  rows: SettlementRow[];
  floatingCredit: number;
  onSettleBoth: (transfer: SettlementTransfer, pending: SettlementRow[]) => void;
}

export const TransfersList: React.FC<TransfersListProps> = ({ transfers, rows, floatingCredit, onSettleBoth }) => (
  <Card className="space-y-3 p-4">
    <h2 className="text-base font-semibold">Who pays whom</h2>
    {transfers.length === 0 ? (
      <p className="text-sm text-muted-foreground">No canteen needs to pay another this month.</p>
    ) : (
      <ul className="space-y-2">
        {transfers.map((t) => {
          const pending = rows.filter(
            (r) => r.status === 'pending' && (r.canteenName === t.from || r.canteenName === t.to)
          );
          return (
            <li key={`${t.from}-${t.to}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{t.from}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-label="pays" />
                <Price amount={t.amount} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-label="to" />
                <span className="font-medium">{t.to}</span>
              </span>
              <Button size="sm" variant="outline" disabled={pending.length === 0} onClick={() => onSettleBoth(t, pending)}>
                {pending.length === 0 ? 'Settled' : 'Mark both settled'}
              </Button>
            </li>
          );
        })}
      </ul>
    )}
    {floatingCredit > 0 && (
      <p className="text-xs text-muted-foreground">
        The rest of what the paying canteens owe stays as floating wallet credit (<Price amount={floatingCredit} />)
        until students spend it.
      </p>
    )}
  </Card>
);