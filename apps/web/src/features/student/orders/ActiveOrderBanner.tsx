import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { statusLabel, statusTone } from './orderLabels';
import { useActiveOrders, useActiveOrdersLive } from './useOrders';

const dot = { amber: 'bg-amber-500', green: 'bg-emerald-500', slate: 'bg-slate-500', red: 'bg-red-500', blue: 'bg-blue-500' } as const;

export function ActiveOrderBanner() {
  const { data } = useActiveOrders();
  useActiveOrdersLive();
  if (!data || data.length === 0) return null;
  const shown = data.slice(0, 2);
  const more = data.length - shown.length;
  return (
    <div className="space-y-2" aria-label="Active orders">
      {shown.map((o) => (
        <Link key={o.id} to={`/student/orders/${o.id}`} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm">
          <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot[statusTone(o)])} aria-hidden />
          <span className="flex-1 truncate">
            <b className="font-mono">{o.tokenNo}</b> · {statusLabel(o)}
            {o.targetPickupTime && o.status !== 'ready' && o.paymentStatus !== 'pending' ? ` · ~${formatTime(o.targetPickupTime)}` : ''}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
      ))}
      {more > 0 && <Link to="/student/orders" className="block text-center text-sm font-medium text-primary">+{more} more</Link>}
    </div>
  );
}