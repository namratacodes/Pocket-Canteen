import type { KitchenColumn, KitchenOrder, OrderStatus } from '@/types/kitchen';

export const columnOf = (s: OrderStatus): KitchenColumn | null =>
  s === 'placed' || s === 'queued' ? 'new' : s === 'preparing' ? 'preparing' : s === 'ready' ? 'ready' : null;

export const canMove = (from: KitchenColumn, to: KitchenColumn): boolean =>
  (from === 'new' && to === 'preparing') || (from === 'preparing' && to === 'ready');

export const nextStep = (col: KitchenColumn): 'preparing' | 'ready' | null =>
  col === 'new' ? 'preparing' : col === 'preparing' ? 'ready' : null;

export function groupOrders(orders: KitchenOrder[]): Record<KitchenColumn, KitchenOrder[]> {
  const g: Record<KitchenColumn, KitchenOrder[]> = { new: [], preparing: [], ready: [] };
  for (const o of orders) {
    const c = columnOf(o.status);
    if (c) g[c].push(o);
  }
  for (const c of Object.keys(g) as KitchenColumn[]) {
    g[c].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }
  return g;
}

/** New + Preparing items, summed by menu item, biggest first. */
export function summarizeItems(orders: KitchenOrder[]): { name: string; quantity: number }[] {
  const m = new Map<string, { name: string; quantity: number }>();
  for (const o of orders) {
    const c = columnOf(o.status);
    if (c !== 'new' && c !== 'preparing') continue;
    for (const it of o.items) {
      const cur = m.get(it.menuItemId) ?? { name: it.name, quantity: 0 };
      cur.quantity += it.quantity;
      m.set(it.menuItemId, cur);
    }
  }
  return [...m.values()].sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}