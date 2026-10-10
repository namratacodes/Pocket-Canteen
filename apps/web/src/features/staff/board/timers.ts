import type { KitchenColumn, KitchenOrder } from '@/types/kitchen';

export type Tone = 'ok' | 'amber' | 'red';
export interface TimerInfo { label: string; tone: Tone; seconds: number; progress?: number; overdue?: boolean }

export const mmss = (total: number): string => {
  const s = Math.max(0, Math.floor(total));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const since = (iso: string | undefined, now: number) =>
  iso ? Math.max(0, (now - new Date(iso).getTime()) / 1000) : 0;

export function timerInfo(col: KitchenColumn, o: KitchenOrder, now: number): TimerInfo {
  if (col === 'new') {
    const s = since(o.createdAt, now);
    return { seconds: s, label: `${mmss(s)} ago`, tone: s > 300 ? 'red' : s > 120 ? 'amber' : 'ok' };
  }
  if (col === 'preparing') {
    const s = since(o.preparingAt ?? o.createdAt, now);
    const eta = o.estimatedPrepSeconds;
    if (!eta) return { seconds: s, label: mmss(s), tone: 'ok' };
    const r = s / eta;
    if (r > 1) {
      return { seconds: s, label: `OVERDUE +${Math.max(1, Math.floor((s - eta) / 60))}m`, tone: 'red', progress: 1, overdue: true };
    }
    return { seconds: s, label: `${mmss(s)} / ${mmss(eta)}`, tone: r > 0.8 ? 'amber' : 'ok', progress: r };
  }
  const s = since(o.readyAt ?? o.updatedAt, now);
  return { seconds: s, label: `waiting ${mmss(s)}`, tone: s > 600 ? 'red' : s > 300 ? 'amber' : 'ok' };
}