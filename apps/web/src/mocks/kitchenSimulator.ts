import { queryClient } from '@/app/queryClient';
import { kitchenBus } from '@/features/staff/board/boardFx';
import { useConnection } from '@/stores/connectionStore';
import * as db from './kitchenDb';

let started = false;
let paused = false;

const emit = (event: string, payload: unknown) => { if (!paused) kitchenBus.emit(event, payload); };

/** Starts on the first kitchen request, so it only runs when the mock server is active. */
export function ensureKitchenSimulator() {
  if (started) return;
  started = true;
  const tick = () => {
    emit('order:new', db.addRandomOrder());
    setTimeout(tick, 20_000 + Math.random() * 20_000);
  };
  setTimeout(tick, 25_000);
}

export function burstOrders(n = 5) {
  for (let i = 0; i < n; i++) emit('order:new', db.addRandomOrder());
}

export function otherTabletMoves(token = 'A-12') {
  const o = db.moveByOtherTablet(token);
  if (o) emit('order:status_changed', { orderId: o.id, from: 'preparing', to: 'ready', order: o });
}

export function studentCancels(token = 'A-17') {
  const id = db.cancelByStudent(token);
  if (id) emit('order:cancelled', { orderId: id, reason: 'Student requested', cancelledBy: 'student' });
}

export function dropSocket(ms = 20_000) {
  paused = true;
  useConnection.getState().set('reconnecting');
  setTimeout(() => {
    paused = false;
    useConnection.getState().set('connected');
    void queryClient.invalidateQueries({ queryKey: ['kitchen'] }); // reconnect refetch, missed orders appear
  }, ms);
}