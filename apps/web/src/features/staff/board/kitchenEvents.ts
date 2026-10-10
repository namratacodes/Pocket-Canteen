import type { KitchenOrder } from '@/types/kitchen';
import { columnOf } from './transitions';

export const normalizeKitchenOrder = (o: Partial<KitchenOrder> & { id: string }): KitchenOrder => ({
  orderUid: o.id,
  tokenNo: '',
  status: 'placed',
  paymentStatus: 'paid',
  studentName: '',
  items: [],
  totalAmount: 0,
  estimatedPrepSeconds: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  verifyAttemptsLeft: 5,
  isLocked: false,
  ...o,
});

/** Stale guard: an event older than what we have cached is ignored. */
export const isStaleEvent = (incomingUpdatedAt: string, cachedUpdatedAt?: string): boolean =>
  !!cachedUpdatedAt && new Date(incomingUpdatedAt).getTime() < new Date(cachedUpdatedAt).getTime();

/** Add or replace by id (dedupe). Terminal statuses are removed. */
export function upsertOrder(list: KitchenOrder[], incoming: KitchenOrder): KitchenOrder[] {
  if (!columnOf(incoming.status)) return list.filter((o) => o.id !== incoming.id);
  const idx = list.findIndex((o) => o.id === incoming.id);
  if (idx === -1) return [...list, incoming];
  if (isStaleEvent(incoming.updatedAt, list[idx].updatedAt)) return list;
  const next = [...list];
  next[idx] = incoming;
  return next;
}

export const removeOrder = (list: KitchenOrder[], id: string): KitchenOrder[] => list.filter((o) => o.id !== id);

export const markLocked = (list: KitchenOrder[], id: string): KitchenOrder[] =>
  list.map((o) => (o.id === id ? { ...o, isLocked: true, verifyAttemptsLeft: 0 } : o));