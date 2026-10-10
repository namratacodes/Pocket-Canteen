import { format, isSameDay, subDays } from 'date-fns';
import { formatTime } from '@/lib/format';
import type { TrackedOrder } from '../tracker/types';

export type Tone = 'amber' | 'green' | 'slate' | 'red' | 'blue';

export function statusLabel(o: Pick<TrackedOrder, 'status' | 'paymentStatus'>): string {
  if (o.status === 'cancelled') return 'Cancelled';
  if (o.status === 'completed') return 'Collected';
  if (o.paymentStatus === 'pending') return 'Awaiting payment';
  if (o.status === 'ready') return 'Ready';
  if (o.status === 'preparing') return 'Preparing';
  return 'Received';
}

export function statusTone(o: Pick<TrackedOrder, 'status' | 'paymentStatus'>): Tone {
  if (o.status === 'cancelled') return 'red';
  if (o.status === 'completed') return 'slate';
  if (o.paymentStatus === 'pending') return 'amber';
  if (o.status === 'ready') return 'green';
  if (o.status === 'preparing') return 'amber';
  return 'blue';
}

export const toneChip: Record<Tone, string> = {
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  green: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  slate: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  red: 'bg-red-500/15 text-red-700 dark:text-red-300',
  blue: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
};

export const itemsSummary = (items: TrackedOrder['items']): string => items.map((i) => `${i.name} ×${i.quantity}`).join(', ');

export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const day = isSameDay(d, now) ? 'Today' : isSameDay(d, subDays(now, 1)) ? 'Yesterday' : format(d, 'd MMM');
  return `${day} ${formatTime(iso)}`;
}