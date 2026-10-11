import { container } from '../src/container';
import { AppError } from '../src/lib/errors';
import { fromPaise } from '../src/lib/money';
import type { EtaPort, LedgerPort, OrdersPort, PaymentsPort } from '../src/ports';

/** In-memory stand-ins for ports owned by OTHER phases. Register the ones you consume; never register a fake for the port you implement. */

export class FakeLedger implements LedgerPort {
  balances = new Map<string, number>();
  calls: { method: string; args: unknown }[] = [];
  async getBalancePaise(userId: string) { return this.balances.get(userId) ?? 0; }
  async holdForCheckout(_ctx: unknown, p: { userId: string; orderId: string; amountPaise: number }) {
    this.calls.push({ method: 'holdForCheckout', args: p });
    const bal = this.balances.get(p.userId) ?? 0;
    if (p.amountPaise > bal) throw new AppError('INSUFFICIENT_BALANCE');
    this.balances.set(p.userId, bal - p.amountPaise);
  }
  async releaseHold(_ctx: unknown, orderId: string) { this.calls.push({ method: 'releaseHold', args: orderId }); return { released: true, releasedPaise: 0 }; }
  async refundCancelledOrder(_ctx: unknown, orderId: string) { this.calls.push({ method: 'refundCancelledOrder', args: orderId }); return { refundedPaise: 0 }; }
  async creditLatePayment(_ctx: unknown, orderId: string) { this.calls.push({ method: 'creditLatePayment', args: orderId }); return { creditedPaise: 0 }; }
}

export class FakePayments implements PaymentsPort {
  calls: string[] = [];
  failNext = false;
  async initiate(orderId: string) {
    this.calls.push(orderId);
    if (this.failNext) { this.failNext = false; throw new AppError('GATEWAY_ERROR'); }
    return { gatewayOrderId: `order_fake_${orderId.slice(0, 8)}`, keyId: 'rzp_test_fake', amountPaise: 0, currency: 'INR' as const };
  }
}

export class FakeEta implements EtaPort {
  seconds = 600;
  async estimate() { return { seconds: this.seconds, source: 'fallback' as const }; }
}

/** Minimal DB-writing stand-in for the orders phase (used by the payments phase tests). */
export class FakeOrders implements OrdersPort {
  async confirmPayment(ctx: { tx: any }, p: { orderId: string; paymentRef: string | null }) {
    const o = await ctx.tx.order.findUnique({ where: { id: p.orderId } });
    if (o.status !== 'pending_payment') return { changed: false, status: o.status };
    await ctx.tx.order.update({ where: { id: p.orderId }, data: { status: 'placed', paymentStatus: 'paid', paymentRef: p.paymentRef, placedAt: new Date() } });
    return { changed: true, status: 'placed' as const };
  }
  async cancelUnpaid(ctx: { tx: any }, p: { orderId: string; reason: string }) {
    const o = await ctx.tx.order.findUnique({ where: { id: p.orderId } });
    if (o.status !== 'pending_payment') return { changed: false, status: o.status };
    await ctx.tx.order.update({ where: { id: p.orderId }, data: { status: 'cancelled', paymentStatus: 'failed', cancelReason: p.reason } });
    return { changed: true, status: 'cancelled' as const };
  }
}

export function installFakes(which: Partial<Record<'ledger' | 'orders' | 'payments' | 'eta', boolean>>) {
  const fakes = { ledger: new FakeLedger(), orders: new FakeOrders(), payments: new FakePayments(), eta: new FakeEta() };
  if (which.ledger) container.register('ledger', fakes.ledger);
  if (which.orders) container.register('orders', fakes.orders);
  if (which.payments) container.register('payments', fakes.payments);
  if (which.eta) container.register('eta', fakes.eta);
  return fakes;
}

export { fromPaise };
