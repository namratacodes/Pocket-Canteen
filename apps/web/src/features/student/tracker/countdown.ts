import type { TrackedOrder } from './types';

export const formatMMSS = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

/** nowMs must already include the server clock offset. Never negative. */
export const remainingSeconds = (targetIso: string, nowMs: number): number =>
  Math.max(0, Math.round((Date.parse(targetIso) - nowMs) / 1000));

/** Capped at 98 so 100% only ever means "ready". */
export function progressPct(order: Pick<TrackedOrder, 'targetPickupTime' | 'createdAt'>, nowMs: number): number {
  if (!order.targetPickupTime) return 0;
  const target = Date.parse(order.targetPickupTime);
  const total = (target - Date.parse(order.createdAt)) / 1000;
  if (total <= 0) return 98;
  const remaining = Math.round((target - nowMs) / 1000);
  return Math.min(98, Math.max(0, (1 - remaining / total) * 100));
}

export const countdownLabel = (targetIso: string, nowMs: number): string => {
  const r = Math.round((Date.parse(targetIso) - nowMs) / 1000);
  return r > 0 ? formatMMSS(r) : 'Almost there…';
};

export type EtaChange = { kind: 'later' | 'sooner' } | null;

/** Later by more than 2 minutes -> amber notice. Sooner by 15s or more -> green notice. */
export function etaChange(prevIso: string | null | undefined, nextIso: string | null | undefined): EtaChange {
  if (!prevIso || !nextIso) return null;
  const diff = (Date.parse(nextIso) - Date.parse(prevIso)) / 1000;
  if (diff > 120) return { kind: 'later' };
  if (diff <= -15) return { kind: 'sooner' };
  return null;
}