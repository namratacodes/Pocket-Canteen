import { Link } from 'react-router-dom';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { TrackedOrder } from '../tracker/types';
import { dayLabel, itemsSummary, statusLabel, statusTone, toneChip } from './orderLabels';

interface Props {
  order: TrackedOrder;
  onReorder?: (o: TrackedOrder) => void;
  reordering?: boolean;
}

export function OrderCard({ order, onReorder, reordering }: Props) {
  const refunded = order.refundedAmount ?? 0;
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <Link to={`/student/orders/${order.id}`} className="block space-y-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold"><span className="font-mono">{order.tokenNo}</span> · {order.canteenName}</p>
          <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', toneChip[statusTone(order)])}>{statusLabel(order)}</span>
        </div>
        <p className="text-sm text-muted-foreground">{itemsSummary(order.items)}</p>
        <p className="text-sm">{formatINR(order.totalAmount)} · {dayLabel(order.createdAt)}</p>
        {order.status === 'cancelled' && refunded > 0 && <p className="text-sm text-muted-foreground">refunded {formatINR(refunded)}</p>}
      </Link>
      {order.status === 'completed' && onReorder && (
        <button
          type="button"
          onClick={() => onReorder(order)}
          disabled={reordering}
          className="mt-3 h-11 w-full rounded-lg border border-primary font-semibold text-primary disabled:opacity-50"
        >
          {reordering ? 'Checking menu…' : 'Reorder'}
        </button>
      )}
    </article>
  );
}