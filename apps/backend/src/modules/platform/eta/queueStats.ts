import { prisma } from '../../../lib/prisma';

export async function queueStats(canteenId: string): Promise<{ depth: number; strain: number }> {
  const rows = await prisma.$queryRaw<{ depth: number; strain: number }[]>`
    SELECT COUNT(DISTINCT o.id)::int AS depth,
           COALESCE(SUM(COALESCE(pm.base_prep_seconds,180) * COALESCE(pm.prep_complexity_weight,1) * oi.quantity),0)::float AS strain
    FROM orders o JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN menu_item_prep_metadata pm ON pm.menu_item_id = oi.menu_item_id
    WHERE o.canteen_id = ${canteenId}::uuid AND o.status IN ('placed','preparing')`;
  return { depth: Number(rows[0]?.depth ?? 0), strain: Number(rows[0]?.strain ?? 0) };
}
