import { isSameDay, subDays, format } from 'date-fns';
import { Clock, Hourglass, ShieldCheck, ShoppingBag, Undo2, Unlock, type LucideIcon } from 'lucide-react';
import type { LedgerEntry } from '../tracker/types';

export type Tone = 'green' | 'amber' | 'slate' | 'blue' | 'red';
export interface LedgerView { icon: LucideIcon; label: string; sign: '+' | '−'; tone: Tone }

export function ledgerMeta(e: LedgerEntry): LedgerView {
  const uid = e.orderUid ?? '';
  switch (e.entryType) {
    case 'refund_credit': return { icon: Undo2, label: `Refund · ${uid}`.trim(), sign: '+', tone: 'green' };
    case 'checkout_hold': return { icon: Hourglass, label: `On hold for ${uid}`.trim(), sign: '−', tone: 'amber' };
    case 'checkout_capture': return { icon: ShoppingBag, label: `Paid · ${uid}`.trim(), sign: '−', tone: 'slate' };
    case 'hold_release': return { icon: Unlock, label: `Hold released · ${uid}`.trim(), sign: '+', tone: 'green' };
    case 'admin_adjustment': return { icon: ShieldCheck, label: `Adjustment by admin · ${e.reason}`, sign: e.amount >= 0 ? '+' : '−', tone: 'blue' };
    case 'expiry': return { icon: Clock, label: 'Credit expired', sign: '−', tone: 'red' };
  }
}

export const toneClass: Record<Tone, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  slate: 'text-slate-700 dark:text-slate-300',
  blue: 'text-blue-600 dark:text-blue-400',
  red: 'text-red-600 dark:text-red-400',
};

export function groupByDay(entries: LedgerEntry[], now: Date = new Date()): { label: string; entries: LedgerEntry[] }[] {
  const out: { label: string; entries: LedgerEntry[] }[] = [];
  for (const e of entries) {
    const d = new Date(e.createdAt);
    const label = isSameDay(d, now) ? 'Today' : isSameDay(d, subDays(now, 1)) ? 'Yesterday' : format(d, 'd MMM');
    const last = out[out.length - 1];
    if (last && last.label === label) last.entries.push(e);
    else out.push({ label, entries: [e] });
  }
  return out;
}