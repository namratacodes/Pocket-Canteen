import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { kitchenKeys } from '@/lib/api/kitchenKeys';
import type { KitchenOrder, OrderStatus } from '@/types/kitchen';
import { useSocketEvent, joinRoom, leaveRoom } from '@/features/staff/deps';
import { kitchenBus, exitOrder } from './boardFx';
import { markLocked, normalizeKitchenOrder, upsertOrder } from './kitchenEvents';
import { useCanteenId } from './useKitchenOrders';

type Listen = (event: string, handler: (p: any) => void) => void;
const listen = useSocketEvent as unknown as Listen;

/** Patches the kitchen cache from socket events. Events are queued while a card is being dragged. */
export function useKitchenLive(dragging: MutableRefObject<boolean>) {
  const qc = useQueryClient();
  const canteenId = useCanteenId();
  const key = kitchenKeys.orders(canteenId);
  const queue = useRef<Array<() => void>>([]);

  const run = useCallback((fn: () => void) => { if (dragging.current) queue.current.push(fn); else fn(); }, [dragging]);
  const flush = useCallback(() => { const q = queue.current; queue.current = []; q.forEach((f) => f()); }, []);
  const patch = useCallback(
    (fn: (l: KitchenOrder[]) => KitchenOrder[]) => run(() => qc.setQueryData<KitchenOrder[]>(key, (l) => (l ? fn(l) : l))),
    [qc, key, run],
  );

  const onNew = useCallback((o: KitchenOrder) => patch((l) => upsertOrder(l, normalizeKitchenOrder(o))), [patch]);
  const onStatus = useCallback(
    (p: { orderId: string; to: OrderStatus; order: KitchenOrder }) => {
      if (p.to === 'completed') run(() => exitOrder(qc, key, p.orderId, 'leave'));
      else patch((l) => upsertOrder(l, normalizeKitchenOrder(p.order)));
    },
    [patch, run, qc, key],
  );
  const onCancelled = useCallback((p: { orderId: string }) => run(() => exitOrder(qc, key, p.orderId, 'strike')), [run, qc, key]);
  const onLocked = useCallback((p: { orderId: string }) => patch((l) => markLocked(l, p.orderId)), [patch]);

  listen('order:new', onNew);
  listen('order:status_changed', onStatus);
  listen('order:cancelled', onCancelled);
  listen('order:pickup_locked', onLocked);

  // Mock simulator events (silent in real mode)
  useEffect(() => {
    const offs = [
      kitchenBus.on('order:new', (p) => onNew(p as KitchenOrder)),
      kitchenBus.on('order:status_changed', (p) => onStatus(p as never)),
      kitchenBus.on('order:cancelled', (p) => onCancelled(p as never)),
      kitchenBus.on('order:pickup_locked', (p) => onLocked(p as never)),
    ];
    return () => offs.forEach((o) => o());
  }, [onNew, onStatus, onCancelled, onLocked]);

  useEffect(() => {
    if (!canteenId) return;
    joinRoom(`canteen:${canteenId}`);
    return () => leaveRoom(`canteen:${canteenId}`);
  }, [canteenId]);

  return { flush };
}