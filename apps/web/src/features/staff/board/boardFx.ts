import { create } from 'zustand';
import type { QueryClient } from '@tanstack/react-query';
import type { KitchenOrder } from '@/types/kitchen';
import { removeOrder } from './kitchenEvents';

interface Fx { leaving: Set<string>; struck: Set<string> }
export const useBoardFx = create<Fx>(() => ({ leaving: new Set(), struck: new Set() }));

const add = (k: keyof Fx, id: string) => useBoardFx.setState((s) => ({ [k]: new Set(s[k]).add(id) }) as Partial<Fx>);
const del = (k: keyof Fx, id: string) =>
  useBoardFx.setState((s) => { const n = new Set(s[k]); n.delete(id); return { [k]: n } as Partial<Fx>; });

/** 'leave' = fade out in 200ms (completed). 'strike' = strike-through for 2s (cancelled). */
export function exitOrder(qc: QueryClient, key: readonly unknown[], id: string, kind: 'leave' | 'strike') {
  const k = kind === 'leave' ? 'leaving' : 'struck';
  add(k, id);
  setTimeout(() => {
    qc.setQueryData<KitchenOrder[]>(key, (l) => (l ? removeOrder(l, id) : l));
    del(k, id);
  }, kind === 'leave' ? 200 : 2000);
}

/** Tiny event bus. The mock simulator emits here; in real mode nothing emits. */
type Handler = (payload: unknown) => void;
const handlers = new Map<string, Set<Handler>>();
export const kitchenBus = {
  on(event: string, h: Handler) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event)!.add(h);
    return () => { handlers.get(event)?.delete(h); };
  },
  emit(event: string, payload: unknown) { handlers.get(event)?.forEach((h) => h(payload)); },
};