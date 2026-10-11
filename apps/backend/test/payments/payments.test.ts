import { beforeEach, describe, expect, it } from 'vitest';
import { container } from '../../src/container';
import { AppError } from '../../src/lib/errors';
import { prisma } from '../../src/lib/prisma';
import paymentsModule from '../../src/modules/payments';
import { fakeGateway } from '../../src/modules/payments/fake.gateway';
import { expirePendingOrders } from '../../src/modules/payments/expire.job';
import { appWith, bearer, makeCanteen, makeOrder, makeUser, resetDb } from '../helpers';
import { installFakes } from '../fakes';

let fakes: ReturnType<typeof installFakes>;
let api: ReturnType<typeof appWith>;
let canteen: Awaited<ReturnType<typeof makeCanteen>>;
let student: Awaited<ReturnType<typeof makeUser>>;
let student2: Awaited<ReturnType<typeof makeUser>>;

beforeEach(async () => {
  await resetDb();
  fakeGateway.reset();
  fakes = installFakes({ orders: true, ledger: true });
  api = appWith(paymentsModule);
  canteen = await makeCanteen();
  student = await makeUser('student');
  student2 = await makeUser('student');
});

const pending = (o: Partial<{ walletPaise: number; expiresAt: Date | null; totalPaise: number }> = {}) =>
  makeOrder({
    studentId: student.id, canteenId: canteen.id, status: 'pending_payment', paymentStatus: 'pending', placedAt: null,
    totalPaise: o.totalPaise ?? 10000, walletPaise: o.walletPaise ?? 0,
    expiresAt: o.expiresAt === undefined ? new Date(Date.now() + 600_000) : o.expiresAt,
  });
const initiate = (id: string) => container.get('payments').initiate(id);
const hook = (b: { rawBody: Buffer; signature: string }) =>
  api.post('/api/v1/webhooks/razorpay').set('content-type', 'application/json').set('x-razorpay-signature', b.signature).send(b.rawBody.toString('utf8'));
const status = async (id: string) => (await prisma.order.findUniqueOrThrow({ where: { id } })).status;

describe('initiate', () => {
  it('creates one attempt and is idempotent', async () => {
    const o = await pending();
    const a = await initiate(o.id);
    const b = await initiate(o.id);
    expect(a.gatewayOrderId).toBe(b.gatewayOrderId);
    expect(a.amountPaise).toBe(10000);
    expect(await prisma.paymentAttempt.count()).toBe(1);
  });
  it('409 for wallet-only, expired and non-pending orders', async () => {
    const wallet = await pending({ walletPaise: 10000 });
    const expired = await pending({ expiresAt: new Date(Date.now() - 1000) });
    const placed = await makeOrder({ studentId: student.id, canteenId: canteen.id, status: 'placed' });
    for (const o of [wallet, expired, placed]) await expect(initiate(o.id)).rejects.toMatchObject({ code: 'CONFLICT' });
  });
});

describe('webhook', () => {
  it('valid capture places the order', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    const r = await hook(fakeGateway.simulateCapture(p.gatewayOrderId, 10000));
    expect(r.status).toBe(200);
    expect(await status(o.id)).toBe('placed');
    expect((await prisma.paymentAttempt.findFirstOrThrow()).status).toBe('captured');
  });

  it('same webhook 5x concurrently has effect once', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    let calls = 0;
    const orig = fakes.orders.confirmPayment.bind(fakes.orders);
    fakes.orders.confirmPayment = async (...a: Parameters<typeof orig>) => { calls++; return orig(...a); };
    const evt = fakeGateway.simulateCapture(p.gatewayOrderId, 10000);
    const rs = await Promise.all(Array.from({ length: 5 }, () => hook(evt)));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    expect(calls).toBe(1);
    expect(await prisma.webhookEvent.count()).toBe(1);
    expect(await status(o.id)).toBe('placed');
  });

  it('bad signature is 400 and changes nothing', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    const evt = fakeGateway.simulateCapture(p.gatewayOrderId, 10000);
    expect((await hook({ rawBody: evt.rawBody, signature: 'deadbeef' })).status).toBe(400);
    expect(await status(o.id)).toBe('pending_payment');
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('amount mismatch is noted, order stays pending, response 200', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    expect((await hook(fakeGateway.simulateCapture(p.gatewayOrderId, 9999))).status).toBe(200);
    expect(await status(o.id)).toBe('pending_payment');
    expect((await prisma.paymentAttempt.findFirstOrThrow()).status).toBe('amount_mismatch');
  });

  it('payment.failed marks attempt failed, order stays pending', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    await hook(fakeGateway.signedEvent('payment.failed', p.gatewayOrderId, 'pay_x', 10000));
    expect((await prisma.paymentAttempt.findFirstOrThrow()).status).toBe('failed');
    expect(await status(o.id)).toBe('pending_payment');
  });

  it('late payment credits the student once', async () => {
    const o = await makeOrder({ studentId: student.id, canteenId: canteen.id, status: 'cancelled', paymentStatus: 'failed', totalPaise: 10000 });
    await prisma.paymentAttempt.create({ data: { orderId: o.id, razorpayOrderId: 'order_fake_late', amount: 100, status: 'created' } });
    const evt = fakeGateway.simulateCapture('order_fake_late', 10000);
    await hook(evt);
    await hook(evt);
    expect(fakes.ledger.calls.filter((c) => c.method === 'creditLatePayment')).toHaveLength(1);
  });

  it('handler failure gives 500, leaves no dedupe row, retry succeeds', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    const orig = fakes.orders.confirmPayment.bind(fakes.orders);
    let failOnce = true;
    fakes.orders.confirmPayment = async (...a: Parameters<typeof orig>) => {
      if (failOnce) { failOnce = false; throw new AppError('INTERNAL'); }
      return orig(...a);
    };
    const evt = fakeGateway.simulateCapture(p.gatewayOrderId, 10000);
    expect((await hook(evt)).status).toBe(500);
    expect(await prisma.webhookEvent.count()).toBe(0);
    expect((await hook(evt)).status).toBe(200);
    expect(await status(o.id)).toBe('placed');
  });
});

describe('client confirm', () => {
  const confirm = (orderId: string, body: object, user = student) =>
    api.post(`/api/v1/orders/${orderId}/pay/confirm`).set(bearer(user)).send(body);

  it('works, is idempotent, rejects bad signature and foreign orders', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    const payId = 'pay_client_1';
    const good = { razorpayOrderId: p.gatewayOrderId, razorpayPaymentId: payId, razorpaySignature: fakeGateway.signCheckout(p.gatewayOrderId, payId) };
    const r1 = await confirm(o.id, good);
    expect(r1.status).toBe(200);
    expect(r1.body.data.status).toBe('placed');
    expect((await confirm(o.id, good)).status).toBe(200);
    expect((await confirm(o.id, { ...good, razorpaySignature: 'bad' })).status).toBe(400);
    expect((await confirm(o.id, good, student2)).status).toBe(404);
  });
});

describe('expiry job', () => {
  it('cancels unpaid expired orders, pays ones captured at the gateway, ignores fresh ones', async () => {
    const dead = await pending();
    await initiate(dead.id);
    const paid = await pending();
    const pp = await initiate(paid.id);
    fakeGateway.simulateCapture(pp.gatewayOrderId, 10000);
    const fresh = await pending();
    await initiate(fresh.id);
    await prisma.order.updateMany({ where: { id: { in: [dead.id, paid.id] } }, data: { expiresAt: new Date(Date.now() - 1000) } });

    await expirePendingOrders();

    expect(await status(dead.id)).toBe('cancelled');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: dead.id } })).cancelReason).toBe('payment_timeout');
    expect(await status(paid.id)).toBe('placed');
    expect(await status(fresh.id)).toBe('pending_payment');
  });
});

describe('dev simulator', () => {
  it('captures through the webhook path', async () => {
    const o = await pending();
    const p = await initiate(o.id);
    expect((await api.post(`/api/v1/dev/payments/${p.gatewayOrderId}/capture`)).status).toBe(200);
    expect(await status(o.id)).toBe('placed');
  });
  it('is absent in production', async () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const prod = appWith(paymentsModule);
      expect((await prod.post('/api/v1/dev/payments/x/capture')).status).toBe(404);
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
