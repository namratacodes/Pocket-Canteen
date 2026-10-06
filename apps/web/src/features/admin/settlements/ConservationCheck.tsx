import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { formatINR } from '@/lib/format';
import type { SettlementReport } from '@/types/admin';
import { checkConservation } from './computeTransfers';
import { cn } from '@/lib/utils';

const signed = (n: number) => `${n < 0 ? '−' : ''}${formatINR(Math.abs(n))}`;

export const ConservationCheck: React.FC<{ report: SettlementReport }> = ({ report }) => {
  const result = checkConservation(report.rows, report.floatingCredit);
  // Use the backend's verdict when it sends one; otherwise our own check.
  const balanced = report.balanced ?? result.balanced;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-xl border p-3 text-sm',
        balanced ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'
      )}
    >
      {balanced ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      {balanced ? (
        <p>
          Balanced: Σ Δ ({signed(result.sum)}) + floating credit ({formatINR(report.floatingCredit)}) = 0
        </p>
      ) : (
        <p>
          Mismatch {formatINR(Math.abs(result.gap))}: Σ Δ ({signed(result.sum)}) + floating credit (
          {formatINR(report.floatingCredit)}) should be 0. Contact the backend team before settling.
        </p>
      )}
    </div>
  );
};