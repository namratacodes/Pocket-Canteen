import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it } from 'vitest';
import * as db from '@/mocks/trackerDb';
import { computeOffset } from '@/lib/time/serverClock';
import { groupByDay, ledgerMeta } from '../wallet/ledgerMeta';
import { countdownLabel, etaChange, formatMMSS, progressPct, remainingSeconds } from './countdown';
import { trackerKeys } from './keys';
import { isStale, markCancelled, upsertActive } from './orderEvents';
import type { LedgerEntry, TrackedOrder } from './types';

const NOW = Date.parse('2026-10-10T10:00:00Z');
const iso = (ms: number) => new Date(NOW + ms).toISOString();
const mk = (p: Partial<TrackedOrder>): TrackedOrder => ({
  id: 'o1', orderUid: 'u1', tokenNo: 'A-14', canteenId: 'c', canteenName: 'Main', status: 'queued', paymentStatus: 'paid',
  items: [], totalAmount: 110, walletAmountApplied: 0, gatewayAmount: 110, estimatedPrepSeconds: 100,
  targetPickupTime: iso(100_000), createdAt: iso(0), updatedAt: iso(0), ...p,
});

describe('countdown', () => {
  it('counts down and never goes negative', () => {
    expect(remainingSeconds(iso(100_000), NOW + 40_000)).toBe(60);
    expect(remainingSeconds(iso(100_000), NOW + 500_000)).toBe(0);
    expect(formatMMSS(462)).toBe('07:42');
    expect(countdownLabel(iso(100_000), NOW + 120_000)).toBe('Almost there…');
  });
  it('stays right when the device clock is 5 minutes wrong', () => {
    const deviceNow = NOW + 5 * 60_000;
    const offset = computeOffset(NOW, deviceNow, deviceNow);
    expect(offset).toBe(-5 * 60_000);
    expect(remainingSeconds(iso(100_000), deviceNow + offset)).toBe(100);
  });
  it('progress is capped at 98 and starts at 0', () => {
    const o = mk({});
    expect(progressPct(o, NOW)).toBe(0);
    expect(progressPct(o, NOW + 50_000)).toBeCloseTo(50);
    expect(progressPct(o, NOW + 900_000)).toBe(98);
  });
  it('flags later by more than 2 min, sooner by 15s or more', () => {
    expect(etaChange(iso(0), iso(150_000))).toEqual({ kind: 'later' });
    expect(etaChange(iso(0), iso(100_000))).toBeNull();
    expect(etaChange(iso(100_000), iso(60_000))).toEqual({ kind: 'sooner' });
    expect(etaChange(null, iso(0))).toBeNull();
  });
});

describe('order events', () => {
  it('ignores stale events', () => {
    expect(isStale(iso(0), iso(5))).toBe(true);
    expect(isStale(iso(5), iso(0))).toBe(false);
  });
  it('upsertActive adds, replaces, ignores stale, removes terminal', () => {
    const a = mk({ updatedAt: iso(10), status: 'preparing' });
    const list = upsertActive([], a);
    expect(list).toHaveLength(1);
    expect(upsertActive(list, mk({ updatedAt: iso(0), status: 'queued' }))[0].status).toBe('preparing');
    expect(upsertActive(list, mk({ updatedAt: iso(20), status: 'ready' }))[0].status).toBe('ready');
    expect(upsertActive(list, mk({ updatedAt: iso(30), status: 'completed' }))).toHaveLength(0);
  });
  it('markCancelled updates the cached order and drops it from active', () => {
    const qc = new QueryClient();
    qc.setQueryData(trackerKeys.order('o1'), mk({}));
    qc.setQueryData(trackerKeys.active, [mk({})]);
    markCancelled(qc, { orderId: 'o1', reason: 'Item out of stock', refundedAmount: 110, cancelledBy: 'staff' });
    const o = qc.getQueryData<TrackedOrder>(trackerKeys.order('o1'))!;
    expect(o.status).toBe('cancelled');
    expect(o.paymentStatus).toBe('refunded_to_wallet');
    expect(qc.getQueryData<TrackedOrder[]>(trackerKeys.active)).toHaveLength(0);
  });
});

describe('ledgerMeta', () => {
  const e = (entryType: LedgerEntry['entryType'], amount: number): LedgerEntry => ({
    id: 1, entryType, amount, orderUid: 'U1', reason: 'r', balanceAfter: 0, createdAt: new Date(2026, 9, 10, 12).toISOString(),
  });
  it('maps every entry type to the right sign and tone', () => {
    expect(ledgerMeta(e('refund_credit', 110))).toMatchObject({ sign: '+', tone: 'green', label: 'Refund · U1' });
    expect(ledgerMeta(e('checkout_hold', -30))).toMatchObject({ sign: '−', tone: 'amber', label: 'On hold for U1' });
    expect(ledgerMeta(e('checkout_capture', -50))).toMatchObject({ sign: '−', tone: 'slate', label: 'Paid · U1' });
    expect(ledgerMeta(e('hold_release', 30))).toMatchObject({ sign: '+', tone: 'green' });
    expect(ledgerMeta(e('admin_adjustment', 100))).toMatchObject({ sign: '+', tone: 'blue', label: 'Adjustment by admin · r' });
    expect(ledgerMeta(e('admin_adjustment', -20)).sign).toBe('−');
    expect(ledgerMeta(e('expiry', -10))).toMatchObject({ sign: '−', tone: 'red', label: 'Credit expired' });
  });
  it('groups by Today, Yesterday and date', () => {
    const now = new Date(2026, 9, 10, 15);
    const at = (d: number, h: number) => ({ ...e('refund_credit', 1), createdAt: new Date(2026, 9, d, h).toISOString() });
    const g = groupByDay([at(10, 13), at(10, 9), at(9, 20), at(2, 8)], now);
    expect(g.map((x) => x.label)).toEqual(['Today', 'Yesterday', '2 Oct']);
    expect(g[0].entries).toHaveLength(2);
  });
});

describe('mock tracker rules', () => {
  const run = (fn: () => unknown) => { try { fn(); return null; } catch (err) { return err as { status: number; code: string }; } };
  beforeEach(() => db.resetTrackerDb());

  it('wallet starts at 50 with 8 entries covering every type', () => {
    expect(db.getWallet().balance).toBe(50);
    const page1 = db.listLedger('all', null);
    const page2 = db.listLedger('all', page1.nextCursor);
    const all = [...page1.items, ...page2.items];
    expect(all).toHaveLength(8);
    expect(page2.nextCursor).toBeNull();
    expect(new Set(all.map((x) => x.entryType)).size).toBe(6);
    expect(all[0].balanceAfter).toBe(50);
    expect(db.listLedger('credit', null).items.every((x) => x.amount > 0)).toBe(true);
  });
  it('cancel while queued refunds the wallet', () => {
    db.createSim('normal');
    const r = db.studentCancel(db.SIM_ID);
    expect(r.refundedAmount).toBe(110);
    expect(db.getWallet().balance).toBe(160);
    expect(db.listLedger('all', null).items[0].entryType).toBe('refund_credit');
  });
  it('cancel after preparing is rejected', () => {
    db.createSim('normal');
    db.updateSim({ status: 'preparing' });
    expect(run(() => db.studentCancel(db.SIM_ID))?.code).toBe('ALREADY_PREPARING');
  });
  it('payment retry works while pending and is gone after expiry', () => {
    db.createSim('pending');
    expect(db.retryPayment(db.SIM_ID).order.paymentStatus).toBe('paid');
    db.createSim('pending');
    db.paymentExpire();
    expect(db.getWallet().balance).toBe(100);
    expect(run(() => db.retryPayment(db.SIM_ID))?.status).toBe(410);
  });
  it('resend code is rate limited', () => {
    db.createSim('normal');
    expect(db.resendCode(db.SIM_ID, 100_000)).toEqual({ sent: true });
    expect(run(() => db.resendCode(db.SIM_ID, 110_000))?.status).toBe(429);
    expect(db.resendCode(db.SIM_ID, 140_000)).toEqual({ sent: true });
  });
  it('past orders page through to the end', () => {
    const p1 = db.listPast(null);
    const p2 = db.listPast(p1.nextCursor);
    const p3 = db.listPast(p2.nextCursor);
    expect(p1.items.length + p2.items.length + p3.items.length).toBe(14);
    expect(p3.nextCursor).toBeNull();
  });
});