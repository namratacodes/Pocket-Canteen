import { useEffect, useRef, useState } from 'react';
import { playDing, playNew } from '@/lib/audio/audioService';
import { useKitchenPrefs } from '@/stores/kitchenPrefsStore';
import type { KitchenOrder } from '@/types/kitchen';
import { columnOf } from './transitions';

/** Detects orders that newly appeared in the New column (socket event or refetch after reconnect). */
export function useNewOrderAlerts(orders: KitchenOrder[] | undefined) {
  const seen = useRef<Set<string> | null>(null);
  const unseen = useRef(0);
  const baseTitle = useRef(typeof document !== 'undefined' ? document.title : '');
  const [pulse, setPulse] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!orders) return;
    if (seen.current === null) { seen.current = new Set(orders.map((o) => o.id)); return; }
    const fresh = orders.filter((o) => columnOf(o.status) === 'new' && !seen.current!.has(o.id));
    orders.forEach((o) => seen.current!.add(o.id));
    if (fresh.length === 0) return;

    const { soundOn, volume } = useKitchenPrefs.getState();
    if (soundOn) playNew(volume);
    unseen.current += fresh.length;
    if (document.hidden || !document.hasFocus()) document.title = `(${unseen.current}) New orders`;

    const ids = fresh.map((o) => o.id);
    setPulse((p) => new Set([...p, ...ids]));
    setTimeout(() => setPulse((p) => { const n = new Set(p); ids.forEach((i) => n.delete(i)); return n; }), 10_000);
  }, [orders]);

  useEffect(() => {
    const reset = () => { unseen.current = 0; document.title = baseTitle.current; };
    window.addEventListener('focus', reset);
    return () => { window.removeEventListener('focus', reset); reset(); };
  }, []);

  return pulse;
}

/** Every 60s, if a New order has waited > 2 min, play a softer ding. */
export function useNagMode(orders: KitchenOrder[] | undefined) {
  const ref = useRef(orders);
  ref.current = orders;
  const { soundOn, nagMode, volume } = useKitchenPrefs();
  useEffect(() => {
    if (!soundOn || !nagMode) return;
    const id = setInterval(() => {
      const now = Date.now();
      const late = ref.current?.some((o) => columnOf(o.status) === 'new' && now - new Date(o.createdAt).getTime() > 120_000);
      if (late) playDing(volume);
    }, 60_000);
    return () => clearInterval(id);
  }, [soundOn, nagMode, volume]);
}