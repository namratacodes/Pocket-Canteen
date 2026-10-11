import type { Order, Prisma } from '@prisma/client';
import { derivePickupCode } from '../../lib/crypto';
import { toPaise } from '../../lib/money';
import type { KitchenOrderDTO, OrderLineDTO, StudentOrderDTO } from '../../types/dto';

type Db = Prisma.TransactionClient | import('@prisma/client').PrismaClient;

/** order_items joined to menu_items.name, grouped by order id. */
export async function loadLines(db: Db, orderIds: string[]): Promise<Map<string, OrderLineDTO[]>> {
  const out = new Map<string, OrderLineDTO[]>();
  if (!orderIds.length) return out;
  const rows = await db.orderItem.findMany({
    where: { orderId: { in: orderIds } },
    include: { menuItem: { select: { name: true } } },
    orderBy: { id: 'asc' },
  });
  for (const r of rows) {
    const list = out.get(r.orderId) ?? [];
    list.push({ menuItemId: r.menuItemId, name: r.menuItem.name, quantity: r.quantity, unitPricePaise: toPaise(r.priceAtOrderTime) });
    out.set(r.orderId, list);
  }
  return out;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);
const PICKUP_STATES = ['placed', 'preparing', 'ready'];

export function toStudentOrderDTO(o: Order, items: OrderLineDTO[]): StudentOrderDTO {
  return {
    id: o.id,
    orderUid: o.orderUid,
    tokenNo: o.tokenNo,
    canteenId: o.canteenId,
    status: o.status,
    paymentStatus: o.paymentStatus,
    items,
    totalPaise: toPaise(o.totalAmount),
    walletAppliedPaise: toPaise(o.walletAmountApplied),
    gatewayPaise: toPaise(o.gatewayAmount),
    estimatedPrepSeconds: o.estimatedPrepSeconds,
    predictedReadyAt: iso(o.predictedReadyAt),
    etaSource: (o.etaSource as 'ml' | 'fallback' | null) ?? null,
    pickupCode: PICKUP_STATES.includes(o.status) ? derivePickupCode(o.id, o.pickupSalt) : null,
    createdAt: o.createdAt.toISOString(),
    placedAt: iso(o.placedAt),
    readyAt: iso(o.readyAt),
    expiresAt: iso(o.expiresAt),
  };
}

export function toKitchenOrderDTO(o: Order, items: OrderLineDTO[]): KitchenOrderDTO {
  return {
    id: o.id,
    orderUid: o.orderUid,
    tokenNo: o.tokenNo,
    status: o.status,
    items,
    totalPaise: toPaise(o.totalAmount),
    placedAt: iso(o.placedAt),
    predictedReadyAt: iso(o.predictedReadyAt),
    estimatedPrepSeconds: o.estimatedPrepSeconds,
  };
}
