import { api } from '@/features/staff/deps';
import { useCartStore } from '@/stores/cartStore';
import type { MenuItem } from '@/types';
import type { ReorderLine } from './reorderPlan';

export const fetchCanteenMenu = (canteenId: string) => api<unknown>(`/canteens/${canteenId}/menu`);

/** Returns false if the student chose not to replace a cart from another canteen. */
export function addToCart(canteenId: string, canteenName: string, lines: ReorderLine[]): boolean {
  const cart = useCartStore.getState();
  const otherCanteen = !!cart.canteenId && cart.canteenId !== canteenId && Object.keys(cart.lines).length > 0;
  if (otherCanteen) {
    if (!window.confirm('Your cart has items from another canteen. Replace it with this order?')) return false;
    cart.clear();
  }
  for (const line of lines) {
    for (let n = 0; n < line.quantity; n++) useCartStore.getState().add(line.item as unknown as MenuItem, canteenName);
  }
  return true;
}