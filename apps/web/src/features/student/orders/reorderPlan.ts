import type { TrackedOrder } from '../tracker/types';

export interface MenuLike {
  id: string;
  name: string;
  price: number;
  isAvailable?: boolean;
  isSoldOut?: boolean;
  available?: boolean;
}

/** Finds menu items anywhere in a menu response, whatever its nesting (flat, by category, etc.). */
export function flattenMenu(json: unknown): MenuLike[] {
  const out: MenuLike[] = [];
  const seen = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (!v || typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    if (typeof o.id === 'string' && typeof o.name === 'string' && typeof o.price === 'number' && !seen.has(o.id)) {
      seen.add(o.id);
      out.push(o as unknown as MenuLike);
    }
    Object.values(o).forEach(walk);
  };
  walk(json);
  return out;
}

export const isMenuItemAvailable = (m: MenuLike) => m.isAvailable !== false && m.isSoldOut !== true && m.available !== false;

export interface ReorderLine { menuItemId: string; name: string; price: number; quantity: number; item: MenuLike }

export function planReorder(order: Pick<TrackedOrder, 'items'>, menu: MenuLike[]): { add: ReorderLine[]; skipped: string[] } {
  const add: ReorderLine[] = [];
  const skipped: string[] = [];
  for (const it of order.items) {
    const m = menu.find((x) => x.id === it.menuItemId);
    if (m && isMenuItemAvailable(m)) add.push({ menuItemId: m.id, name: m.name, price: m.price, quantity: it.quantity, item: m });
    else skipped.push(it.name);
  }
  return { add, skipped };
}