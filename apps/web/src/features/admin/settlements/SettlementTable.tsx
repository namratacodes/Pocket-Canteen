import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Price } from '@/components/common/Price';
import { formatDate } from '../shared/dates';
import type { SettlementRow } from '@/types/admin';
import { StatusPill } from '../shared/StatusPill';
import { DeltaAmount } from './DeltaAmount';

export interface SettlementTableProps {
  rows: SettlementRow[];
  onOpen: (row: SettlementRow) => void;
  onSettle: (row: SettlementRow) => void;
}

export const SettlementTable: React.FC<SettlementTableProps> = ({ rows, onOpen, onSettle }) => (
  <Card className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          <th className="px-4 py-3 font-medium">Canteen</th>
          <th className="px-4 py-3 text-right font-medium">Credit issued</th>
          <th className="px-4 py-3 text-right font-medium">Credit redeemed</th>
          <th className="px-4 py-3 text-right font-medium">Net Δ</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 text-right font-medium">Action</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50">
            <td className="px-4 py-3 font-medium">
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`View entries for ${r.canteenName}`}
              >
                {r.canteenName}
              </button>
            </td>
            <td className="px-4 py-3 text-right"><Price amount={r.creditIssued} /></td>
            <td className="px-4 py-3 text-right"><Price amount={r.creditRedeemed} /></td>
            <td className="px-4 py-3 text-right"><DeltaAmount value={r.netPayable} /></td>
            <td className="px-4 py-3">
              {r.status === 'settled' ? (
                <div>
                  <StatusPill tone="success" icon={CheckCircle2}>Settled</StatusPill>
                  {r.settledAt && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      by {r.recordedBy ?? 'Admin'}, {formatDate(r.settledAt)}
                    </p>
                  )}
                </div>
              ) : (
                <StatusPill tone="warning" icon={Clock}>Pending</StatusPill>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <Button variant="outline" size="sm" disabled={r.status === 'settled'} onClick={() => onSettle(r)}>
                Mark settled
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);