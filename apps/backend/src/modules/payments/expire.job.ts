import { container } from '../../container';
import { logger } from '../../lib/logger';
import { toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { runTx } from '../../lib/tx';
import { getGateway } from './gateway';
import { markPaid } from './payment.service';

export async function expirePendingOrders(): Promise<void> {
  const stale = await prisma.order.findMany({
    where: { status: 'pending_payment', expiresAt: { lt: new Date() } },
    take: 100,
    include: { payments: true },
  });
  for (const o of stale) {
    try {
      // 1) did a payment land that we never heard about? (closes the race)
      for (const a of o.payments.filter((p) => p.status === 'created')) {
        const found = (await getGateway().listPayments(a.razorpayOrderId)).find((x) => x.status === 'captured' && x.amountPaise === toPaise(a.amount));
        if (found) await runTx((ctx) => markPaid(ctx, { gatewayOrderId: a.razorpayOrderId, paymentId: found.paymentId, amountPaise: found.amountPaise }));
      }
      // 2) still unpaid -> cancel (orders phase re-checks status under lock)
      await runTx((ctx) => container.get('orders').cancelUnpaid(ctx, { orderId: o.id, reason: 'payment_timeout' }));
    } catch (err) {
      logger.error({ err, orderId: o.id }, 'expire order failed');
    }
  }
}
