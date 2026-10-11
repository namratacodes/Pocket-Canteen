import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/prisma';
import { defaultRecorder } from '../../src/realtime/emitter';
import { key, place, world, type World } from './_kit';

let w: World;
beforeEach(async () => { w = await world(); });
const events = (name: string) => defaultRecorder.calls.filter((c) => c.event === name);

describe('POST /orders', () => {
  it('gateway order stays pending_payment, token A-1, payment returned, no order:new yet', async () => {
    const r = await place(w);
    expect(r.status).toBe(201);
    expect(r.body.data.order.status).toBe('pending_payment');
    expect(r.body.data.order.tokenNo).toBe(`${w.canteen.tokenPrefix}-1`);
    expect(r.body.data.order.totalPaise).toBe(10000);
    expect(r.body.data.order.pickupCode).toBeNull();
    expect(r.body.data.payment).toBeTruthy();
    expect(w.fakes.payments.calls).toHaveLength(1);
    expect(events('order:new')).toHaveLength(0);
  });

  it('wallet-only order is placed immediately', async () => {
    w.fakes.ledger.balances.set(w.student.id, 50000);
    const r = await place(w);
    expect(r.body.data.order.status).toBe('placed');
    expect(r.body.data.payment).toBeNull();
    expect(r.body.data.order.pickupCode).toMatch(/^\d{4}$/);
    expect(events('order:new')).toHaveLength(1);
    const hold = w.fakes.ledger.calls.find((c) => c.method === 'holdForCheckout')!;
    expect((hold.args as any).amountPaise).toBe(10000);
  });

  it('splits wallet and gateway', async () => {
    w.fakes.ledger.balances.set(w.student.id, 3000);
    const r = await place(w);
    expect(r.body.data.order.walletAppliedPaise).toBe(3000);
    expect(r.body.data.order.gatewayPaise).toBe(7000);
    expect(r.body.data.order.status).toBe('pending_payment');
  });

  it('useWallet=false ignores balance', async () => {
    w.fakes.ledger.balances.set(w.student.id, 50000);
    const r = await place(w, { useWallet: false });
    expect(r.body.data.order.walletAppliedPaise).toBe(0);
    expect(r.body.data.order.gatewayPaise).toBe(10000);
  });

  it('is idempotent (sequential and concurrent)', async () => {
    w.fakes.ledger.balances.set(w.student.id, 50000);
    const k = key();
    const a = await place(w, { k });
    const b = await place(w, { k });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect(b.body.data.order.id).toBe(a.body.data.order.id);
    expect(await prisma.order.count()).toBe(1);
    expect(w.fakes.ledger.calls.filter((c) => c.method === 'holdForCheckout')).toHaveLength(1);

    const k2 = key();
    const [c, d] = await Promise.all([place(w, { k: k2 }), place(w, { k: k2 })]);
    expect([c.status, d.status].sort()).toEqual([200, 201]);
    expect(c.body.data.order.id).toBe(d.body.data.order.id);
    expect(await prisma.order.count()).toBe(2);
  });

  it('rejects bad cart and missing key', async () => {
    const noKey = await w.api.post('/api/v1/orders').set(w.as(w.student)).send({ canteenId: w.canteen.id, items: [{ menuItemId: w.item.id, quantity: 1 }] });
    expect(noKey.status).toBe(400);
    expect((await place(w, { items: [{ menuItemId: w.item.id, quantity: 0 }] })).status).toBe(400);
    expect((await place(w, { items: [{ menuItemId: w.item.id, quantity: 1 }, { menuItemId: w.item.id, quantity: 1 }] })).status).toBe(400);
    const priced = await w.api.post('/api/v1/orders').set(w.as(w.student)).set('Idempotency-Key', key())
      .send({ canteenId: w.canteen.id, items: [{ menuItemId: w.item.id, quantity: 1, price: 1 }] });
    expect(priced.status).toBe(400);
  });

  it('unavailable item, foreign item, closed canteen, 4th unpaid order', async () => {
    const off = await (await import('../helpers')).makeMenuItem(w.canteen.id, { available: false });
    expect((await place(w, { items: [{ menuItemId: off.id, quantity: 1 }] })).status).toBe(409);
    expect((await place(w, { items: [{ menuItemId: w.foreignItem.id, quantity: 1 }] })).status).toBe(409);
    await prisma.canteen.update({ where: { id: w.canteen.id }, data: { isOpen: false } });
    const closed = await place(w);
    expect(closed.status).toBe(409);
    expect(closed.body.error.code).toBe('CANTEEN_CLOSED');
    await prisma.canteen.update({ where: { id: w.canteen.id }, data: { isOpen: true } });
    for (let i = 0; i < 3; i++) expect((await place(w)).status).toBe(201);
    const fourth = await place(w);
    expect(fourth.status).toBe(429);
    expect(fourth.body.error.code).toBe('TOO_MANY_PENDING_ORDERS');
  });

  it('gateway failure cancels the order and releases the hold', async () => {
    w.fakes.ledger.balances.set(w.student.id, 3000);
    w.fakes.payments.failNext = true;
    const r = await place(w);
    expect(r.status).toBe(502);
    expect(r.body.error.code).toBe('GATEWAY_ERROR');
    const o = await prisma.order.findFirstOrThrow();
    expect(o.status).toBe('cancelled');
    expect(o.paymentStatus).toBe('failed');
    expect(w.fakes.ledger.calls.some((c) => c.method === 'releaseHold')).toBe(true);
  });

  it('20 parallel orders get 20 distinct sequential tokens', async () => {
    const students = await Promise.all(Array.from({ length: 20 }, () => (async () => (await import('../helpers')).makeUser('student'))()));
    const rs = await Promise.all(students.map((s) => place(w, { user: s })));
    expect(rs.every((r) => r.status === 201)).toBe(true);
    const nums = rs.map((r) => Number(r.body.data.order.tokenNo.split('-')[1])).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

describe('GET /orders', () => {
  it('lists own orders newest first and hides others', async () => {
    await place(w); await place(w);
    await place(w, { user: w.student2 });
    const r = await w.api.get('/api/v1/orders?limit=1').set(w.as(w.student));
    expect(r.body.data).toHaveLength(1);
    expect(r.body.nextCursor).toBeTruthy();
    const r2 = await w.api.get(`/api/v1/orders?limit=5&cursor=${r.body.nextCursor}`).set(w.as(w.student));
    expect(r2.body.data).toHaveLength(1);
    expect(r2.body.nextCursor).toBeNull();
  });
  it('foreign order is 404', async () => {
    const o = await place(w);
    expect((await w.api.get(`/api/v1/orders/${o.body.data.order.id}`).set(w.as(w.student2))).status).toBe(404);
    expect((await w.api.get(`/api/v1/orders/${o.body.data.order.id}`).set(w.as(w.student))).status).toBe(200);
  });
});
