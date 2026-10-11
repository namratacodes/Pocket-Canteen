import { container } from '../../container';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { lockOrder, type TxContext } from '../../lib/tx';
import type { PaymentsPort } from '../../ports';
import type { PaymentInitDTO } from '../../types/dto';
import { getGateway } from './gateway';

async function initiate(orderId: string): Promise<PaymentInitDTO> {
  const gateway = getGateway();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError('NOT_FOUND');
  if (order.status !== 'pending_payment' || order.gatewayAmount.lte(0)) throw new AppError('CONFLICT', 'Order is not awaiting a gateway payment');
  if (order.expiresAt && order.expiresAt.getTime() < Date.now()) throw new AppError('CONFLICT', 'Order has expired');

  const existing = await prisma.paymentAttempt.findFirst({ where: { orderId, status: 'created' }, orderBy: { createdAt: 'desc' } });
  if (existing) {
    return { gatewayOrderId: existing.razorpayOrderId, keyId: gateway.keyId(), amountPaise: toPaise(existing.amount), currency: 'INR' };
  }

  const account = await prisma.canteenPaymentAccount.findFirst({ where: { canteenId: order.canteenId, isActive: true } });
  const amountPaise = toPaise(order.gatewayAmount);
  let gatewayOrderId: string;
  try {
    ({ gatewayOrderId } = await gateway.createOrder({
      amountPaise,
      receipt: order.orderUid,
      notes: { orderId: order.id, canteenId: order.canteenId },
      transferToAccountRef: account?.razorpayAccountRef,
    }));
  } catch (err) {
    logger.error({ err, orderId }, 'gateway createOrder failed');
    throw new AppError('GATEWAY_ERROR');
  }
  await prisma.paymentAttempt.create({ data: { orderId, razorpayOrderId: gatewayOrderId, amount: order.gatewayAmount, status: 'created' } });
  return { gatewayOrderId, keyId: gateway.keyId(), amountPaise, currency: 'INR' };
}

export const paymentService: PaymentsPort = { initiate };

/** The single idempotent confirmation path (webhook, client confirm, expiry job all use it). */
export async function markPaid(ctx: TxContext, p: { gatewayOrderId: string; paymentId: string; amountPaise: number }) {
  const attempt = await ctx.tx.paymentAttempt.findUnique({ where: { razorpayOrderId: p.gatewayOrderId } });
  if (!attempt) {
    logger.warn({ gatewayOrderId: p.gatewayOrderId }, 'payment for unknown gateway order, ignored');
    return;
  }
  const order = await lockOrder(ctx.tx, attempt.orderId);
  if (!order) return;
  if (attempt.status === 'captured') return; // already processed

  if (toPaise(attempt.amount) !== p.amountPaise) {
    logger.error({ gatewayOrderId: p.gatewayOrderId, expected: toPaise(attempt.amount), got: p.amountPaise }, 'payment amount mismatch');
    await ctx.tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'amount_mismatch', razorpayPaymentId: p.paymentId } });
    return; // commit the note, do NOT mark paid
  }

  await ctx.tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'captured', razorpayPaymentId: p.paymentId } });
  if (order.status === 'pending_payment') {
    await container.get('orders').confirmPayment(ctx, { orderId: order.id, paymentRef: p.paymentId });
  } else if (order.status === 'cancelled' && order.paymentStatus === 'failed') {
    await container.get('ledger').creditLatePayment(ctx, order.id); // money arrived after we gave up
  } else if (order.status === 'cancelled') {
    logger.warn({ orderId: order.id }, 'payment captured for cancelled order that is already refunded');
  }
}
