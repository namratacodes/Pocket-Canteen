import { queryClient } from '@/app/queryClient';
import { studentBus } from '@/features/student/tracker/studentBus';
import { useConnection } from '@/stores/connectionStore';
import * as db from './trackerDb';

let timers: ReturnType<typeof setTimeout>[] = [];
let paused = false;

const clear = () => { timers.forEach(clearTimeout); timers = []; };
const at = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)); };
const emit = (event: string, payload: unknown) => { if (!paused) studentBus.emit(event, payload); };

function moveTo(to: 'preparing' | 'ready' | 'completed') {
  const prev = db.getSim();
  if (!prev) return;
  const now = new Date().toISOString();
  const order = db.updateSim({ status: to, ...(to === 'ready' ? { readyAt: now } : {}), ...(to === 'completed' ? { completedAt: now } : {}) });
  emit('order:status_changed', { orderId: order.id, from: prev.status, to, order });
}

/** 0s queued (ETA 90s) · 15s preparing · 30s ETA +150s · 60s call to walk · 75s ready */
export function startTimeline() {
  clear();
  at(15_000, () => moveTo('preparing'));
  at(30_000, () => {
    const o = db.delayEta(150);
    emit('order:eta_updated', { orderId: o.id, estimatedPrepSeconds: o.estimatedPrepSeconds, targetPickupTime: o.targetPickupTime });
  });
  at(60_000, () => {
    const o = db.getSim();
    if (o) emit('order:call_to_walk', { orderId: o.id, tokenNo: o.tokenNo, counterLabel: o.counterLabel });
  });
  at(75_000, () => moveTo('ready'));
}

export function restartSim(scenario: 'normal' | 'pending' = 'normal') {
  clear();
  db.createSim(scenario);
  if (scenario === 'normal') startTimeline();
}

/** Starts on the first request for the sim order, so it only runs when the mock server is active. */
export function ensureSim() { if (!db.getSim()) restartSim('normal'); }

export function staffVerified() { clear(); moveTo('completed'); }

export function cancelByStaff() {
  clear();
  const { order, refundedAmount } = db.staffCancel();
  emit('order:cancelled', { orderId: order.id, reason: order.cancelReason, refundedAmount, cancelledBy: 'staff' });
  studentBus.emit('wallet:updated', db.getWallet());
}

export function paymentExpires() {
  clear();
  const { order, wallet } = db.paymentExpire();
  emit('order:cancelled', { orderId: order.id, reason: order.cancelReason, refundedAmount: 0, cancelledBy: 'system' });
  studentBus.emit('wallet:updated', wallet);
}

export function dropSocket(ms = 20_000) {
  paused = true;
  useConnection.getState().set('reconnecting');
  setTimeout(() => {
    paused = false;
    useConnection.getState().set('connected');
    void queryClient.invalidateQueries({ queryKey: ['tracker'] });
    void queryClient.invalidateQueries({ queryKey: ['wallet'] });
  }, ms);
}