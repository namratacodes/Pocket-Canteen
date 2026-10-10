import { useCallback, useSyncExternalStore } from 'react';

interface Ticker { now: number; listeners: Set<() => void>; id?: ReturnType<typeof setInterval> }
const tickers = new Map<number, Ticker>();

function getTicker(ms: number): Ticker {
  let t = tickers.get(ms);
  if (!t) { t = { now: Date.now(), listeners: new Set() }; tickers.set(ms, t); }
  return t;
}

export function useNow(ms = 1000): number {
  const t = getTicker(ms);
  const subscribe = useCallback(
    (cb: () => void) => {
      t.listeners.add(cb);
      if (!t.id) {
        t.now = Date.now();
        t.id = setInterval(() => {
          t.now = Date.now();
          t.listeners.forEach((l) => l());
        }, ms);
      }
      return () => {
        t.listeners.delete(cb);
        if (t.listeners.size === 0 && t.id) { clearInterval(t.id); t.id = undefined; }
      };
    },
    [t, ms],
  );
  return useSyncExternalStore(subscribe, () => t.now, () => t.now);
}