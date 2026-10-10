import { api } from '@/features/staff/deps';

let offset = 0;
let synced = false;
let inflight: Promise<void> | null = null;

/** Server clock minus device clock, compensating for half the round trip. */
export const computeOffset = (serverMs: number, sentAt: number, receivedAt: number) =>
  serverMs - (sentAt + receivedAt) / 2;

export const serverNow = () => Date.now() + offset;
export const getClockOffset = () => offset;

/** Syncs once per session. If /time is missing or fails, the device clock is used (offset 0). */
export function syncServerClock(): Promise<void> {
  if (synced) return Promise.resolve();
  inflight ??= (async () => {
    const t0 = Date.now();
    try {
      const r = await api<{ now?: string; serverTime?: string } | string>('/time');
      const t1 = Date.now();
      const raw = typeof r === 'string' ? r : (r.now ?? r.serverTime);
      const ms = raw ? Date.parse(raw) : NaN;
      if (Number.isFinite(ms)) { offset = computeOffset(ms, t0, t1); synced = true; }
    } catch { /* keep offset 0 */ }
    inflight = null;
  })();
  return inflight;
}