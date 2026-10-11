import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { realtime } from '../../realtime/emitter';
import { fallbackSeconds } from './eta/fallback';

const MIN = 60_000;

/** Keeps predicted_ready_at honest. Never touches estimated_prep_seconds or eta_source (ML ground truth). */
export async function etaTicker(): Promise<void> {
  const now = Date.now();

  // preparing orders that are overdue keep a believable ETA
  const overdue = await prisma.order.findMany({
    where: { status: 'preparing', predictedReadyAt: { lt: new Date(now + 30_000) } },
    take: 200,
    select: { id: true, studentId: true },
  });
  for (const o of overdue) {
    try {
      const at = new Date(now + 60_000);
      const r = await prisma.order.updateMany({ where: { id: o.id, status: 'preparing' }, data: { predictedReadyAt: at } });
      if (r.count) realtime.toUser(o.studentId, 'order:eta_updated', { orderId: o.id, predictedReadyAt: at.toISOString(), etaSeconds: 60, source: 'fallback' });
    } catch (err) {
      logger.error({ err, orderId: o.id }, 'eta ticker (preparing) failed');
    }
  }

  // placed orders: recompute from the queue ahead of them
  const placed = await prisma.order.findMany({
    where: { status: 'placed', placedAt: { not: null } },
    orderBy: { placedAt: 'asc' },
    take: 200,
    include: { items: { include: { menuItem: { include: { prep: true } } } } },
  });
  const queues = new Map<string, Date[]>();
  for (const canteenId of new Set(placed.map((o) => o.canteenId))) {
    const rows = await prisma.order.findMany({ where: { canteenId, status: { in: ['placed', 'preparing'] }, placedAt: { not: null } }, select: { placedAt: true } });
    queues.set(canteenId, rows.map((r) => r.placedAt!));
  }
  for (const o of placed) {
    try {
      const ahead = (queues.get(o.canteenId) ?? []).filter((t) => t.getTime() < o.placedAt!.getTime()).length;
      const seconds = fallbackSeconds(o.items.map((i) => ({ baseSeconds: i.menuItem.prep?.basePrepSeconds ?? 180, quantity: i.quantity })), ahead);
      const newReady = new Date(now + seconds * 1000);
      if (o.predictedReadyAt && Math.abs(newReady.getTime() - o.predictedReadyAt.getTime()) < 30_000) continue;
      const r = await prisma.order.updateMany({ where: { id: o.id, status: 'placed' }, data: { predictedReadyAt: newReady } });
      if (r.count) realtime.toUser(o.studentId, 'order:eta_updated', { orderId: o.id, predictedReadyAt: newReady.toISOString(), etaSeconds: seconds, source: 'fallback' });
    } catch (err) {
      logger.error({ err, orderId: o.id }, 'eta ticker (placed) failed');
    }
  }
}

/** Log only, no writes. */
export async function stuckOrderWatch(): Promise<void> {
  const now = Date.now();
  const stuck = await prisma.order.findMany({
    where: {
      OR: [
        { status: 'preparing', updatedAt: { lt: new Date(now - 45 * MIN) } },
        { status: 'ready', readyAt: { lt: new Date(now - 60 * MIN) } },
      ],
    },
    select: { id: true, canteenId: true, tokenNo: true, status: true },
    take: 200,
  });
  for (const o of stuck) logger.warn({ orderId: o.id, canteenId: o.canteenId, tokenNo: o.tokenNo, status: o.status }, 'order looks stuck');
}
