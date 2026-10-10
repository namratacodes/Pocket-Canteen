import type { QueryClient } from '@tanstack/react-query';
import { trackerKeys } from './keys';
import type { CancelledPayload, EtaPayload, TrackedOrder } from './types';

export const isTerminal = (s: TrackedOrder['status']) => s === 'completed' || s === 'cancelled';

/** Ignore an event whose order is older than what we already have. */
export const isStale = (incomingUpdatedAt: string, cachedUpdatedAt?: string) =>
  !!cachedUpdatedAt && Date.parse(incomingUpdatedAt) < Date.parse(cachedUpdatedAt);

export function upsertActive(list: TrackedOrder[], o: TrackedOrder): TrackedOrder[] {
  if (isTerminal(o.status)) return list.filter((x) => x.id !== o.id);
  const i = list.findIndex((x) => x.id === o.id);
  if (i === -1) return [...list, o];
  if (isStale(o.updatedAt, list[i].updatedAt)) return list;
  const next = [...list];
  next[i] = o;
  return next;
}

const mapOne = (qc: QueryClient, id: string, fn: (o: TrackedOrder) => TrackedOrder) => {
  qc.setQueryData<TrackedOrder>(trackerKeys.order(id), (cur) => (cur ? fn(cur) : cur));
  qc.setQueryData<TrackedOrder[]>(trackerKeys.active, (l) => l?.map((o) => (o.id === id ? fn(o) : o)));
};

export function patchOrder(qc: QueryClient, o: TrackedOrder) {
  qc.setQueryData<TrackedOrder>(trackerKeys.order(o.id), (cur) => (cur && isStale(o.updatedAt, cur.updatedAt) ? cur : o));
  qc.setQueryData<TrackedOrder[]>(trackerKeys.active, (l) => (l ? upsertActive(l, o) : l));
}

export function patchEta(qc: QueryClient, p: EtaPayload) {
  mapOne(qc, p.orderId, (o) => ({ ...o, estimatedPrepSeconds: p.estimatedPrepSeconds, targetPickupTime: p.targetPickupTime }));
}

export function markCancelled(qc: QueryClient, p: CancelledPayload) {
  const refunded = p.refundedAmount ?? 0;
  mapOne(qc, p.orderId, (o) => ({
    ...o,
    status: 'cancelled',
    paymentStatus: refunded > 0 ? 'refunded_to_wallet' : o.paymentStatus,
    cancelReason: p.reason ?? o.cancelReason,
    refundedAmount: refunded,
  }));
  qc.setQueryData<TrackedOrder[]>(trackerKeys.active, (l) => l?.filter((o) => o.id !== p.orderId));
}