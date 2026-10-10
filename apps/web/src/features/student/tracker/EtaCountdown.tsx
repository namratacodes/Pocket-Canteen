import { X } from 'lucide-react';
import { formatTime } from '@/lib/format';
import { countdownLabel, progressPct, remainingSeconds } from './countdown';
import type { EtaNotice as Notice } from './useOrderLive';
import type { TrackedOrder } from './types';

interface Props { order: TrackedOrder; nowMs: number; mode: 'eta' | 'waiting' }

export function EtaCountdown({ order, nowMs, mode }: Props) {
  if (mode === 'waiting') {
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">Waiting for you</p>
        <p className="text-sm text-muted-foreground">since {formatTime(order.readyAt ?? order.updatedAt)}</p>
      </div>
    );
  }
  if (!order.targetPickupTime) return <p className="text-center text-muted-foreground">Estimating your time…</p>;

  const pct = progressPct(order, nowMs);
  const label = countdownLabel(order.targetPickupTime, nowMs);
  const waiting = remainingSeconds(order.targetPickupTime, nowMs) > 0;
  return (
    <div className="space-y-2 text-center">
      <p className="text-3xl font-bold tabular-nums">
        {waiting && <span className="mr-2 text-base font-medium text-muted-foreground">Ready in</span>}
        {label}
      </p>
      <p className="text-sm text-muted-foreground">about {formatTime(order.targetPickupTime)}</p>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs tabular-nums text-muted-foreground">{Math.round(pct)}%</p>
    </div>
  );
}

export function EtaNotice({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const later = notice.kind === 'later';
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-sm ${
        later ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300' : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      }`}
    >
      <p>
        {later
          ? `Kitchen is busier than expected. New time ${formatTime(notice.newTime)}.`
          : `Good news, it's coming sooner. Now about ${formatTime(notice.newTime)}.`}
      </p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 rounded p-1 hover:bg-black/10">
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}