import type { LedgerEntry, Page, TrackedOrder, Wallet } from '@/features/student/tracker/types';
import { MockError } from './kitchenDb';

export const SIM_ID = 'sim_order';
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const iso = (msFromNow = 0) => new Date(Date.now() + msFromNow).toISOString();
const H = 3_600_000;

let sim: TrackedOrder | null = null;
let ledger: LedgerEntry[] = [];
let balance = 0;
let past: TrackedOrder[] = [];
let resendAt = 0;

function seedLedger() {
  const rows: [LedgerEntry['entryType'], number, string | undefined, string | undefined, string, number][] = [
    ['admin_adjustment', 100, undefined, undefined, 'Welcome credit', 72],
    ['checkout_capture', -40, 'PKT-20261007-0021', 'South Hub', 'Order paid', 60],
    ['refund_credit', 60, 'PKT-20261007-0023', 'South Hub', 'Order cancelled', 48],
    ['checkout_hold', -30, 'PKT-20261008-0027', 'Main Canteen', 'Held at checkout', 30],
    ['hold_release', 30, 'PKT-20261008-0027', 'Main Canteen', 'Payment not completed', 29],
    ['checkout_capture', -50, 'PKT-20261009-0031', 'Main Canteen', 'Order paid', 20],
    ['expiry', -10, undefined, undefined, 'Credit expired', 6],
    ['checkout_hold', -10, 'PKT-20261010-0035', 'Juice Corner', 'Held at checkout', 2],
  ];
  balance = 0;
  ledger = rows.map(([entryType, amount, orderUid, canteenName, reason, hoursAgo], i) => {
    balance += amount;
    return { id: i + 1, entryType, amount, orderUid, canteenName, reason, balanceAfter: balance, createdAt: iso(-hoursAgo * H) };
  });
}

function seedPast() {
  const names = ['Main Canteen', 'Mini Canteen'];
  past = Array.from({ length: 14 }, (_, k) => {
    const n = k + 1;
    const cancelled = n % 4 === 0;
    const created = iso(-n * 18 * H);
    return {
      id: `past_${n}`, orderUid: `PKT-2026090${(n % 9) + 1}-00${n}`, tokenNo: `A-${String(n).padStart(2, '0')}`,
      canteenId: n % 2 ? 'canteen_main' : 'canteen_mini', canteenName: names[n % 2],
      status: cancelled ? 'cancelled' : 'completed', paymentStatus: cancelled ? 'refunded_to_wallet' : 'paid',
      items: [
        { menuItemId: 'mi_samosa', name: 'Samosa', quantity: 2, priceAtOrderTime: 20 },
        { menuItemId: n % 2 ? 'mi_roll' : 'mi_chai', name: n % 2 ? 'Chicken Roll' : 'Masala Chai', quantity: 1, priceAtOrderTime: n % 2 ? 70 : 15 },
      ],
      totalAmount: n % 2 ? 110 : 55, walletAmountApplied: 0, gatewayAmount: n % 2 ? 110 : 55,
      estimatedPrepSeconds: 420, targetPickupTime: created, createdAt: created, updatedAt: created,
      completedAt: cancelled ? undefined : created,
      cancelReason: cancelled ? 'Cancelled by you' : undefined, refundedAmount: cancelled ? (n % 2 ? 110 : 55) : undefined,
    } as TrackedOrder;
  });
}

export function resetTrackerDb() {
  sim = null; resendAt = 0;
  seedLedger(); seedPast();
}
resetTrackerDb();

export function createSim(scenario: 'normal' | 'pending' = 'normal'): TrackedOrder {
  const t = iso();
  const pending = scenario === 'pending';
  sim = {
    id: SIM_ID, orderUid: 'PKT-20261010-0042', tokenNo: 'A-14',
    canteenId: 'canteen_main', canteenName: 'Main Canteen', counterLabel: 'Counter A',
    status: pending ? 'placed' : 'queued', paymentStatus: pending ? 'pending' : 'paid',
    items: [
      { menuItemId: 'mi_samosa', name: 'Samosa', quantity: 2, priceAtOrderTime: 20 },
      { menuItemId: 'mi_roll', name: 'Chicken Roll', quantity: 1, priceAtOrderTime: 70 },
    ],
    totalAmount: 110, walletAmountApplied: 50, gatewayAmount: 60,
    estimatedPrepSeconds: pending ? null : 90, targetPickupTime: pending ? null : iso(90_000),
    paymentExpiresAt: pending ? iso(10 * 60_000) : undefined,
    createdAt: t, updatedAt: t,
  };
  return clone(sim);
}

export const getSim = (): TrackedOrder | null => (sim ? clone(sim) : null);

export function updateSim(patch: Partial<TrackedOrder>): TrackedOrder {
  if (!sim) throw new MockError(404, 'NOT_FOUND');
  const t = Math.max(Date.now(), Date.parse(sim.updatedAt) + 1);
  sim = { ...sim, ...patch, updatedAt: new Date(t).toISOString() };
  return clone(sim);
}

export function delayEta(seconds: number): TrackedOrder {
  if (!sim?.targetPickupTime) throw new MockError(404, 'NOT_FOUND');
  return updateSim({
    targetPickupTime: new Date(Date.parse(sim.targetPickupTime) + seconds * 1000).toISOString(),
    estimatedPrepSeconds: (sim.estimatedPrepSeconds ?? 0) + seconds,
  });
}

export const getWallet = (): Wallet => ({ balance, updatedAt: ledger[ledger.length - 1]?.createdAt ?? iso() });

function credit(amount: number, type: LedgerEntry['entryType'], o: TrackedOrder, reason: string): Wallet {
  balance += amount;
  ledger.push({ id: ledger.length + 1, entryType: type, amount, orderUid: o.orderUid, canteenName: o.canteenName, reason, balanceAfter: balance, createdAt: iso() });
  return getWallet();
}

function cancelInternal(o: TrackedOrder, reason: string) {
  const refund = o.paymentStatus === 'paid' ? o.totalAmount : 0;
  const order = updateSim({
    status: 'cancelled', cancelReason: reason, refundedAmount: refund,
    paymentStatus: refund > 0 ? 'refunded_to_wallet' : o.paymentStatus,
  });
  if (refund > 0) credit(refund, 'refund_credit', order, 'Order cancelled');
  return { order, refundedAmount: refund };
}

const need = (id: string): TrackedOrder => {
  if (!sim || id !== SIM_ID) throw new MockError(404, 'NOT_FOUND');
  return sim;
};

export function studentCancel(id: string) {
  const o = need(id);
  if (o.status === 'preparing' || o.status === 'ready') throw new MockError(409, 'ALREADY_PREPARING');
  if (o.status === 'completed' || o.status === 'cancelled') throw new MockError(409, 'NOT_CANCELLABLE');
  return cancelInternal(o, 'Cancelled by you');
}

export function staffCancel() {
  return cancelInternal(need(SIM_ID), 'Item out of stock');
}

export function paymentExpire() {
  const o = need(SIM_ID);
  const order = updateSim({ status: 'cancelled', paymentStatus: 'failed', cancelReason: 'Payment not completed in time', refundedAmount: 0 });
  const wallet = o.walletAmountApplied > 0 ? credit(o.walletAmountApplied, 'hold_release', order, 'Payment not completed') : getWallet();
  return { order, wallet };
}

export function retryPayment(id: string) {
  const o = need(id);
  if (o.status === 'cancelled' || (o.paymentExpiresAt && Date.parse(o.paymentExpiresAt) < Date.now())) {
    throw new MockError(410, 'PAYMENT_EXPIRED');
  }
  if (o.paymentStatus !== 'pending') throw new MockError(409, 'NOT_PENDING');
  const order = updateSim({
    paymentStatus: 'paid', status: 'queued', paymentExpiresAt: undefined,
    estimatedPrepSeconds: 90, targetPickupTime: iso(90_000),
  });
  return { order, razorpay: { orderId: 'order_mock', amount: order.gatewayAmount * 100, currency: 'INR', keyId: 'mock' } };
}

export function resendCode(id: string, nowMs = Date.now()) {
  need(id);
  if (nowMs - resendAt < 30_000) throw new MockError(429, 'RATE_LIMITED', { retryAfterSec: Math.ceil((30_000 - (nowMs - resendAt)) / 1000) });
  resendAt = nowMs;
  return { sent: true };
}

export const listActive = (): TrackedOrder[] => (sim && sim.status !== 'completed' && sim.status !== 'cancelled' ? [clone(sim)] : []);

export function listPast(cursor: string | null, size = 6): Page<TrackedOrder> {
  const start = cursor ? Number(cursor) || 0 : 0;
  const items = past.slice(start, start + size);
  return { items: clone(items), nextCursor: start + size < past.length ? String(start + size) : null };
}

export function listLedger(type: string | null, cursor: string | null, size = 5): Page<LedgerEntry> {
  const all = [...ledger].reverse().filter((e) => (type === 'credit' ? e.amount > 0 : type === 'debit' ? e.amount < 0 : true));
  const start = cursor ? Number(cursor) || 0 : 0;
  return { items: clone(all.slice(start, start + size)), nextCursor: start + size < all.length ? String(start + size) : null };
}