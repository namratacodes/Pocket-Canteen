import { Prisma, type Order, type OrderStatus } from '@prisma/client';
import { container } from '../../container';
import { env } from '../../config/env';
import { randomToken } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { fromPaise } from '../../lib/money';
import { decodeCursor, encodeCursor } from '../../lib/pagination';
import { prisma } from '../../lib/prisma';
import { isWithinHours } from '../../lib/time';
import { lockOrder, runTx, type TxContext } from '../../lib/tx';
import type { OrdersPort } from '../../ports';
import { realtime } from '../../realtime/emitter';
import type { PaymentInitDTO } from '../../types/dto';
import { loadLines, toKitchenOrderDTO, toStudentOrderDTO } from './dto';
import { priceCart, splitPayment, type CartLine } from './pricing';
import { nextTokenNo, uniqueOrderUid } from './token.service';

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['placed', 'cancelled'],
  placed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed'],
  completed: [],
  cancelled: [],
};

/** One function for every status move. Locks the row, validates, updates, logs. */
export async function transition(
  ctx: TxContext,
  orderId: string,
  to: OrderStatus,
  actorId: string | null,
  data: Prisma.OrderUncheckedUpdateInput = {},
) {
  const order = await lockOrder(ctx.tx, orderId);
  if (!order) throw new AppError('NOT_FOUND');
  if (order.status === 'cancelled') throw new AppError('ORDER_CANCELLED');
  if (!ALLOWED[order.status].includes(to)) throw new AppError('INVALID_TRANSITION', undefined, { from: order.status, to });
  const after = await ctx.tx.order.update({ where: { id: orderId }, data: { status: to, ...data } });
  await ctx.tx.orderStatusLog.create({ data: { orderId, fromStatus: order.status, toStatus: to, changedByUserId: actorId } });
  return { before: order, after };
}

/** Emits order:status_changed. Always called from inside a transaction; the emit itself runs after commit. */
export function emitStatusChanged(ctx: TxContext, before: Order, after: Order, o: { toStudent: boolean; toKitchen?: boolean }) {
  const payload = {
    orderId: after.id,
    tokenNo: after.tokenNo,
    canteenId: after.canteenId,
    from: before.status,
    to: after.status,
    at: new Date().toISOString(),
  };
  ctx.afterCommit(() => {
    if (o.toKitchen !== false) realtime.toCanteen(after.canteenId, 'order:status_changed', payload);
    if (o.toStudent) realtime.toUser(after.studentId, 'order:status_changed', payload);
  });
}

async function studentDTO(order: Order) {
  const lines = await loadLines(prisma, [order.id]);
  return toStudentOrderDTO(order, lines.get(order.id) ?? []);
}

/* ------------------------------ place order ------------------------------ */

export interface PlaceOrderInput {
  studentId: string;
  clientRequestId: string;
  canteenId: string;
  items: CartLine[];
  useWallet: boolean;
}

async function replay(studentId: string, clientRequestId: string) {
  const existing = await prisma.order.findUnique({ where: { studentId_clientRequestId: { studentId, clientRequestId } } });
  if (!existing) return null;
  let payment: PaymentInitDTO | null = null;
  if (
    existing.status === 'pending_payment' &&
    existing.gatewayAmount.gt(0) &&
    existing.expiresAt &&
    existing.expiresAt.getTime() > Date.now()
  ) {
    payment = await container.get('payments').initiate(existing.id);
  }
  return { order: await studentDTO(existing), payment, created: false as const };
}

export async function placeOrder(input: PlaceOrderInput) {
  // 1. replay
  const again = await replay(input.studentId, input.clientRequestId);
  if (again) return again;

  // 2. canteen
  const canteen = await prisma.canteen.findUnique({ where: { id: input.canteenId } });
  if (!canteen) throw new AppError('NOT_FOUND', 'Canteen not found');
  if (!canteen.isOpen || !isWithinHours(canteen.operatingHours as { open: string; close: string })) {
    throw new AppError('CANTEEN_CLOSED');
  }

  // 3. items
  const ids = input.items.map((i) => i.menuItemId);
  const menu = await prisma.menuItem.findMany({ where: { id: { in: ids }, canteenId: input.canteenId } });
  const okIds = new Set(menu.filter((m) => m.isAvailable).map((m) => m.id));
  const bad = ids.filter((id) => !okIds.has(id));
  if (bad.length) throw new AppError('ITEM_UNAVAILABLE', undefined, { itemIds: bad });

  // 4. spam guard
  const pending = await prisma.order.count({
    where: { studentId: input.studentId, status: 'pending_payment', expiresAt: { gt: new Date() } },
  });
  if (pending >= 3) throw new AppError('TOO_MANY_PENDING_ORDERS');

  // 5-6. price + split (server side)
  const { priced, totalPaise } = priceCart(input.items, menu);
  const balance = await container.get('ledger').getBalancePaise(input.studentId);
  const { walletPaise, gatewayPaise } = splitPayment(balance, totalPaise, input.useWallet);

  // 7. ETA, outside the transaction
  let eta: { seconds: number; source: 'ml' | 'fallback' } = { seconds: 600, source: 'fallback' };
  try {
    const r = await container.get('eta').estimate({ canteenId: input.canteenId, items: input.items });
    eta = { seconds: r.seconds, source: r.source };
  } catch {
    /* keep default */
  }

  // 8. one transaction
  let orderId: string;
  try {
    orderId = await runTx(async (ctx) => {
      const tokenNo = await nextTokenNo(ctx.tx, canteen.id, canteen.tokenPrefix);
      const orderUid = await uniqueOrderUid(ctx.tx);
      const order = await ctx.tx.order.create({
        data: {
          orderUid,
          clientRequestId: input.clientRequestId,
          tokenNo,
          pickupSalt: randomToken(12),
          studentId: input.studentId,
          canteenId: canteen.id,
          status: 'pending_payment',
          totalAmount: fromPaise(totalPaise),
          walletAmountApplied: fromPaise(walletPaise),
          gatewayAmount: fromPaise(gatewayPaise),
          estimatedPrepSeconds: eta.seconds,
          etaSource: eta.source,
          expiresAt: gatewayPaise > 0 ? new Date(Date.now() + env.PAYMENT_HOLD_MINUTES * 60_000) : null,
          items: { create: priced.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity, priceAtOrderTime: fromPaise(l.unitPricePaise) })) },
        },
      });
      await ctx.tx.orderStatusLog.create({ data: { orderId: order.id, fromStatus: null, toStatus: 'pending_payment', changedByUserId: input.studentId } });
      if (walletPaise > 0) {
        await container.get('ledger').holdForCheckout(ctx, { userId: input.studentId, orderId: order.id, amountPaise: walletPaise });
      }
      if (gatewayPaise === 0) await confirmPayment(ctx, { orderId: order.id, paymentRef: null });
      return order.id;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const dup = await replay(input.studentId, input.clientRequestId);
      if (dup) return dup;
    }
    throw e;
  }

  // 9. gateway, after commit
  let payment: PaymentInitDTO | null = null;
  if (gatewayPaise > 0) {
    try {
      payment = await container.get('payments').initiate(orderId);
    } catch {
      await runTx((ctx) => cancelUnpaid(ctx, { orderId, reason: 'gateway_error' }));
      throw new AppError('GATEWAY_ERROR');
    }
  }

  // 10. reload
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  return { order: await studentDTO(order), payment, created: true as const };
}

/* ------------------------------ student reads ------------------------------ */

export async function getStudentOrder(studentId: string, id: string) {
  const o = await prisma.order.findFirst({ where: { id, studentId } });
  if (!o) throw new AppError('NOT_FOUND');
  return studentDTO(o);
}

export async function listStudentOrders(studentId: string, limit: number, cursor?: string) {
  const c = cursor ? decodeCursor(cursor) : null;
  const rows = await prisma.order.findMany({
    where: {
      studentId,
      ...(c ? { OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }] } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });
  const page = rows.slice(0, limit);
  const lines = await loadLines(prisma, page.map((o) => o.id));
  return {
    data: page.map((o) => toStudentOrderDTO(o, lines.get(o.id) ?? [])),
    nextCursor: rows.length > limit ? encodeCursor(page[page.length - 1].createdAt, page[page.length - 1].id) : null,
  };
}

/* ------------------------------ cancellation ------------------------------ */

export async function studentCancel(studentId: string, id: string) {
  const owned = await prisma.order.findFirst({ where: { id, studentId }, select: { id: true } });
  if (!owned) throw new AppError('NOT_FOUND');
  await runTx(async (ctx) => {
    const o = await lockOrder(ctx.tx, id);
    if (!o) throw new AppError('NOT_FOUND');
    if (o.status === 'cancelled') throw new AppError('ORDER_CANCELLED');
    if (o.status !== 'placed') throw new AppError('INVALID_TRANSITION', undefined, { from: o.status, to: 'cancelled' });
    const { before, after } = await transition(ctx, id, 'cancelled', studentId, { cancelledByUserId: studentId, cancelReason: 'cancelled_by_student' });
    await container.get('ledger').refundCancelledOrder(ctx, id);
    emitStatusChanged(ctx, before, after, { toStudent: true });
  });
  return getStudentOrder(studentId, id);
}

export async function staffCancel(p: { orderId: string; canteenId: string; actorId: string; reason: string }) {
  await findKitchenOrder(p.orderId, p.canteenId);
  return runTx(async (ctx) => {
    const o = await lockOrder(ctx.tx, p.orderId);
    if (!o) throw new AppError('NOT_FOUND');
    if (o.status === 'cancelled') throw new AppError('ORDER_CANCELLED');
    if (o.status !== 'placed' && o.status !== 'preparing') throw new AppError('INVALID_TRANSITION', undefined, { from: o.status, to: 'cancelled' });
    const { before, after } = await transition(ctx, p.orderId, 'cancelled', p.actorId, { cancelledByUserId: p.actorId, cancelReason: p.reason });
    await container.get('ledger').refundCancelledOrder(ctx, p.orderId);
    emitStatusChanged(ctx, before, after, { toStudent: true });
    const lines = await loadLines(ctx.tx, [p.orderId]);
    return toKitchenOrderDTO(after, lines.get(p.orderId) ?? []);
  });
}

/* ------------------------------ kitchen ------------------------------ */

async function findKitchenOrder(id: string, canteenId: string) {
  const o = await prisma.order.findFirst({ where: { id, canteenId }, select: { id: true } });
  if (!o) throw new AppError('NOT_FOUND');
}

export async function kitchenSnapshot(canteenId: string, statuses: OrderStatus[]) {
  const rows = await prisma.order.findMany({
    where: { canteenId, status: { in: statuses } },
    orderBy: [{ placedAt: 'asc' }, { id: 'asc' }],
  });
  const lines = await loadLines(prisma, rows.map((o) => o.id));
  return rows.map((o) => toKitchenOrderDTO(o, lines.get(o.id) ?? []));
}

export async function kitchenAdvance(p: { orderId: string; canteenId: string; actorId: string; to: 'preparing' | 'ready' }) {
  await findKitchenOrder(p.orderId, p.canteenId);
  return runTx(async (ctx) => {
    let data: Prisma.OrderUncheckedUpdateInput = {};
    if (p.to === 'ready') {
      const cur = await lockOrder(ctx.tx, p.orderId);
      const readyAt = new Date();
      data = {
        readyAt,
        actualPrepSeconds: cur?.placedAt ? Math.round((readyAt.getTime() - cur.placedAt.getTime()) / 1000) : null,
      };
    }
    const { before, after } = await transition(ctx, p.orderId, p.to, p.actorId, data);
    emitStatusChanged(ctx, before, after, { toStudent: true });
    if (p.to === 'ready') {
      ctx.afterCommit(() => realtime.toUser(after.studentId, 'order:ready', { orderId: after.id, tokenNo: after.tokenNo }));
    }
    const lines = await loadLines(ctx.tx, [p.orderId]);
    return toKitchenOrderDTO(after, lines.get(p.orderId) ?? []);
  });
}

/* ------------------------------ OrdersPort ------------------------------ */

export async function confirmPayment(ctx: TxContext, p: { orderId: string; paymentRef: string | null }) {
  const o = await lockOrder(ctx.tx, p.orderId);
  if (!o) throw new AppError('NOT_FOUND');
  if (o.status !== 'pending_payment') return { changed: false, status: o.status };
  const now = new Date();
  const after = await ctx.tx.order.update({
    where: { id: o.id },
    data: {
      status: 'placed',
      paymentStatus: 'paid',
      paymentRef: p.paymentRef,
      placedAt: now,
      expiresAt: null,
      predictedReadyAt: new Date(now.getTime() + (o.estimatedPrepSeconds ?? 600) * 1000),
    },
  });
  await ctx.tx.orderStatusLog.create({ data: { orderId: o.id, fromStatus: 'pending_payment', toStatus: 'placed', changedByUserId: null } });
  const lines = await loadLines(ctx.tx, [o.id]);
  const kitchen = toKitchenOrderDTO(after, lines.get(o.id) ?? []);
  ctx.afterCommit(() => realtime.toCanteen(after.canteenId, 'order:new', kitchen));
  emitStatusChanged(ctx, o, after, { toStudent: true });
  return { changed: true, status: after.status };
}

export async function cancelUnpaid(ctx: TxContext, p: { orderId: string; reason: string }) {
  const o = await lockOrder(ctx.tx, p.orderId);
  if (!o) throw new AppError('NOT_FOUND');
  if (o.status !== 'pending_payment') return { changed: false, status: o.status };
  const after = await ctx.tx.order.update({
    where: { id: o.id },
    data: { status: 'cancelled', paymentStatus: 'failed', cancelReason: p.reason },
  });
  await ctx.tx.orderStatusLog.create({ data: { orderId: o.id, fromStatus: 'pending_payment', toStatus: 'cancelled', changedByUserId: null } });
  await container.get('ledger').releaseHold(ctx, o.id);
  emitStatusChanged(ctx, o, after, { toStudent: true, toKitchen: false });
  return { changed: true, status: after.status };
}

export const ordersService: OrdersPort = { confirmPayment, cancelUnpaid };
