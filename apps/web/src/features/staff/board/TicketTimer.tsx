import { cn } from '@/lib/utils';
import type { TimerInfo, Tone } from './timers';

const toneText: Record<Tone, string> = { ok: 'text-muted-foreground', amber: 'text-amber-500', red: 'text-red-500' };
const toneBar: Record<Tone, string> = { ok: 'bg-sky-500', amber: 'bg-amber-500', red: 'bg-red-500' };

export function TicketTimer({ info }: { info: TimerInfo }) {
  return <span className={cn('font-mono text-sm font-semibold tabular-nums', toneText[info.tone])}>{info.label}</span>;
}

export function TicketProgress({ info }: { info: TimerInfo }) {
  if (info.progress === undefined) return null;
  const pct = Math.min(100, Math.round(info.progress * 100));
  return (
    <div className="flex items-center gap-2" aria-label={`${pct}% of estimated time`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-[width]', toneBar[info.tone])} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}