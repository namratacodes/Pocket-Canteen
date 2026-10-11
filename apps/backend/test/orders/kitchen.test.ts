import { beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../src/container';
import { prisma } from '../../src/lib/prisma';
import { derivePickupCode } from '../../src/lib/crypto';
import { defaultRecorder } from '../../src/realtime/emitter';
import { makeOrder } from '../helpers';
import { ordersService } from '../../src/modules/orders/order.service';
import { runTx } from '../../src/lib/tx';
import { place, world, type World } from './_kit';

let w: World;
beforeEach(async () => { w = await world(); });
const events = (name: string) => defaultRecorder.calls.filter((c) => c.event === name);
const mk = (status: any = 'placed', extra: any = {}) =>
  makeOrder({ studentId: w.student.id, canteenId: w.canteen.id, status, items: [{ menuItemId: w.item.id, quantity: 1, pricePaise: 5000 }], ...extra });
const post = (id: string, path: string, who: any = w.staff, body?: object) =>
  w.api.post(`/api/v1/staff/orders/${id}/${path}`).set(w.as(who)).send(body ?? {});

describe('state machine', () => {
  it('start -> ready -> verify completes, with events and actualPrepSeconds', async () => {
    const o = await mk('placed', { placedAt: new Date(Date.now() - 120_000) });
    expect((await post(o.id, 'start')).body.data.status).toBe('preparing');
    expect((await post(o.id, 'ready')).body.data.status).toBe('ready');
    const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(row.actualPrepSeconds).toBeGreaterThanOrEqual(119);
    expect(events('order:ready')).toHaveLength(1);
    expect(events('order:status_changed')).toHaveLength(4); // 2 transitions x (canteen + user)
    const ok = await post(o.id, 'verify-pickup', w.staff, { code: derivePickupCode(o.id, o.pickupSalt) });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('completed');
  });

  it('illegal moves are 409; cancelled gives ORDER_CANCELLED', async () => {
    const o = await mk('placed');
    expect((await post(o.id, 'ready')).body.error.code).toBe('INVALID_TRANSITION');
    const done = await mk('completed');
    expect((await post(done.id, 'start')).status).toBe(409);
    const c = await mk('cancelled');
    expect((await post(c.id, 'start')).body.error.code).toBe('ORDER_CANCELLED');
  });

  it('cancel vs start race has exactly one winner', async () => {
    const o = await mk('placed');
    const [a, b] = await Promise.all([
      w.api.post(`/api/v1/orders/${o.id}/cancel`).set(w.as(w.student)),
      post(o.id, 'start'),
    ]);
    expect([a.status, b.status].filter((s) => s === 200)).toHaveLength(1);
    expect([a.status, b.status].filter((s) => s === 409)).toHaveLength(1);
  });

  it('snapshot excludes unpaid/completed and is oldest first', async () => {
    const t = Date.now();
    const b = await mk('placed', { placedAt: new Date(t - 1000) });
    const a = await mk('preparing', { placedAt: new Date(t - 5000) });
    await mk('pending_payment', { placedAt: null });
    await mk('completed');
    const r = await w.api.get('/api/v1/staff/orders').set(w.as(w.staff));
    expect(r.body.data.map((x: any) => x.id)).toEqual([a.id, b.id]);
    expect((await w.api.get('/api/v1/staff/orders?status=completed').set(w.as(w.staff))).status).toBe(400);
    expect((await w.api.get('/api/v1/staff/orders?status=ready').set(w.as(w.staff))).body.data).toHaveLength(0);
  });
});

describe('cancellation', () => {
  it('student cancels only while placed; refund once', async () => {
    const o = await mk('placed');
    const r = await w.api.post(`/api/v1/orders/${o.id}/cancel`).set(w.as(w.student));
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('cancelled');
    expect(w.fakes.ledger.calls.filter((c) => c.method === 'refundCancelledOrder')).toHaveLength(1);
    expect((await w.api.post(`/api/v1/orders/${o.id}/cancel`).set(w.as(w.student))).body.error.code).toBe('ORDER_CANCELLED');
    const p = await mk('preparing');
    expect((await w.api.post(`/api/v1/orders/${p.id}/cancel`).set(w.as(w.student))).body.error.code).toBe('INVALID_TRANSITION');
    const u = await mk('pending_payment');
    expect((await w.api.post(`/api/v1/orders/${u.id}/cancel`).set(w.as(w.student))).status).toBe(409);
  });

  it('staff cancel needs a reason; works at preparing', async () => {
    const o = await mk('preparing');
    expect((await post(o.id, 'cancel', w.staff, {})).status).toBe(400);
    expect((await post(o.id, 'cancel', w.staff, { reason: 'ab' })).status).toBe(400);
    const r = await post(o.id, 'cancel', w.staff, { reason: 'Out of stock' });
    expect(r.status).toBe(200);
    const row = await prisma.order.findUniqueOrThrow({ where: { id: o.id } });
    expect(row.cancelReason).toBe('Out of stock');
    expect(row.cancelledByUserId).toBe(w.staff.id);
  });
});

describe('tenant isolation', () => {
  it('other canteen staff get 404 everywhere', async () => {
    const o = await mk('placed');
    for (const [p, body] of [['start', {}], ['ready', {}], ['cancel', { reason: 'nope nope' }], ['verify-pickup', { code: '1234' }]] as const) {
      expect((await post(o.id, p, w.staffB, body)).status).toBe(404);
    }
    expect((await w.api.get('/api/v1/staff/orders').set(w.as(w.staffB))).body.data).toHaveLength(0);
    expect((await w.api.get('/api/v1/staff/orders').set(w.as(w.student))).status).toBe(403);
  });
});

describe('pickup verification', () => {
  it('code only for owner in active states', async () => {
    const o = await mk('ready');
    const mine = await w.api.get(`/api/v1/orders/${o.id}`).set(w.as(w.student));
    expect(mine.body.data.pickupCode).toBe(derivePickupCode(o.id, o.pickupSalt));
    const done = await mk('completed');
    expect((await w.api.get(`/api/v1/orders/${done.id}`).set(w.as(w.student))).body.data.pickupCode).toBeNull();
    expect((await w.api.get(`/api/v1/orders/${o.id}`).set(w.as(w.student2))).status).toBe(404);
  });

  it('5 wrong codes lock; counter persists; admin unlock restores', async () => {
    const o = await mk('ready');
    const good = derivePickupCode(o.id, o.pickupSalt);
    const bad = good === '1234' ? '4321' : '1234';
    const first = await post(o.id, 'verify-pickup', w.staff, { code: bad });
    expect(first.status).toBe(422);
    expect(first.body.error.code).toBe('PICKUP_CODE_INVALID');
    expect(first.body.error.details.remainingAttempts).toBe(4);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).pickupAttempts).toBe(1);
    for (let i = 0; i < 3; i++) await post(o.id, 'verify-pickup', w.staff, { code: bad });
    const fifth = await post(o.id, 'verify-pickup', w.staff, { code: bad });
    expect(fifth.status).toBe(423);
    expect(events('order:pickup_locked').map((e) => e.target).sort()).toEqual(['admins', 'canteen']);
    expect((await post(o.id, 'verify-pickup', w.staff, { code: good })).status).toBe(423);
    expect((await w.api.post(`/api/v1/admin/orders/${o.id}/unlock-pickup`).set(w.as(w.staff))).status).toBe(403);
    expect((await w.api.post(`/api/v1/admin/orders/${o.id}/unlock-pickup`).set(w.as(w.admin))).body.data.ok).toBe(true);
    expect((await post(o.id, 'verify-pickup', w.staff, { code: good })).status).toBe(200);
  });

  it('not ready is 409 NOT_READY; bad format is 400', async () => {
    const o = await mk('preparing');
    expect((await post(o.id, 'verify-pickup', w.staff, { code: '1234' })).body.error.code).toBe('NOT_READY');
    expect((await post(o.id, 'verify-pickup', w.staff, { code: '12a4' })).status).toBe(400);
  });
});

describe('OrdersPort', () => {
  it('confirmPayment and cancelUnpaid are idempotent', async () => {
    const r = await place(w, { useWallet: false });
    const id = r.body.data.order.id;
    const port = container.get('orders');
    expect(port).toBe(ordersService);
    expect((await runTx((c) => port.confirmPayment(c, { orderId: id, paymentRef: 'pay_1' }))).changed).toBe(true);
    expect((await runTx((c) => port.confirmPayment(c, { orderId: id, paymentRef: 'pay_1' }))).changed).toBe(false);
    expect(defaultRecorder.calls.filter((c) => c.event === 'order:new')).toHaveLength(1);
    const row = await prisma.order.findUniqueOrThrow({ where: { id } });
    expect(row.status).toBe('placed');
    expect(row.paymentStatus).toBe('paid');
    expect(row.paymentRef).toBe('pay_1');
    expect(row.predictedReadyAt).toBeTruthy();
    expect((await runTx((c) => port.cancelUnpaid(c, { orderId: id, reason: 'x' }))).changed).toBe(false);

    const u = await place(w, { useWallet: false });
    defaultRecorder.clear();
    expect((await runTx((c) => port.cancelUnpaid(c, { orderId: u.body.data.order.id, reason: 'expired' }))).changed).toBe(true);
    expect((await runTx((c) => port.cancelUnpaid(c, { orderId: u.body.data.order.id, reason: 'expired' }))).changed).toBe(false);
    const ev = defaultRecorder.calls.filter((c) => c.event === 'order:status_changed');
    expect(ev).toHaveLength(1);
    expect(ev[0].target).toBe('user');
    expect(w.fakes.ledger.calls.filter((c) => c.method === 'releaseHold')).toHaveLength(1);
  });
});
