import { describe, it, expect, beforeEach } from 'vitest';
import {
  useCartStore,
  selectCount,
  selectSubtotal,
} from '@/stores/cartStore';
import type { MenuItem } from '@/types';

const mockItem1: MenuItem = {
  id: 'item_1',
  canteenId: 'canteen_main',
  name: 'Samosa (2 pc)',
  price: 20,
  category: 'Snacks',
  isAvailable: true,
  isVeg: true,
  basePrepSeconds: 180,
};

const mockItem2: MenuItem = {
  id: 'item_2',
  canteenId: 'canteen_main',
  name: 'Masala Chai',
  price: 15,
  category: 'Drinks',
  isAvailable: true,
  isVeg: true,
  basePrepSeconds: 120,
};

const mockItemOtherCanteen: MenuItem = {
  id: 'item_juice_1',
  canteenId: 'canteen_juice',
  name: 'Mango Shake',
  price: 60,
  category: 'Drinks',
  isAvailable: true,
  isVeg: true,
  basePrepSeconds: 240,
};

describe('cartStore Unit Tests', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    localStorage.clear();
  });

  it('adds items from the same canteen and calculates subtotal and count correctly', () => {
    const res1 = useCartStore.getState().add(mockItem1, 'Main Canteen');
    expect(res1).toBe('added');

    const res2 = useCartStore.getState().add(mockItem2, 'Main Canteen');
    expect(res2).toBe('added');

    const state = useCartStore.getState();
    expect(state.canteenId).toBe('canteen_main');
    expect(state.canteenName).toBe('Main Canteen');
    expect(selectCount(state)).toBe(2);
    expect(selectSubtotal(state)).toBe(35); // 20 + 15
  });

  it('enforces single canteen rule when adding from a different canteen', () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen');

    // Attempt to add from Juice Corner
    const res = useCartStore.getState().add(mockItemOtherCanteen, 'Juice Corner');
    expect(res).toBe('needs_switch');

    // Cart is preserved
    const state = useCartStore.getState();
    expect(state.canteenId).toBe('canteen_main');
    expect(state.lines['item_1']).toBeDefined();
    expect(state.lines['item_juice_1']).toBeUndefined();
  });

  it('forceReplace clears previous canteen and starts new cart', () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen');
    useCartStore.getState().forceReplace(mockItemOtherCanteen, 'Juice Corner');

    const state = useCartStore.getState();
    expect(state.canteenId).toBe('canteen_juice');
    expect(state.canteenName).toBe('Juice Corner');
    expect(state.lines['item_1']).toBeUndefined();
    expect(state.lines['item_juice_1'].qty).toBe(1);
    expect(selectSubtotal(state)).toBe(60);
  });

  it('caps item quantity at 10', () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen');

    // Increment 12 times
    for (let i = 0; i < 12; i++) {
      useCartStore.getState().inc('item_1');
    }

    const state = useCartStore.getState();
    expect(state.lines['item_1'].qty).toBe(10);
  });

  it('decrements and removes item when reaching 0', () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen');
    useCartStore.getState().inc('item_1'); // qty 2

    useCartStore.getState().dec('item_1'); // qty 1
    expect(useCartStore.getState().lines['item_1'].qty).toBe(1);

    useCartStore.getState().dec('item_1'); // qty 0 -> removed
    const state = useCartStore.getState();
    expect(state.lines['item_1']).toBeUndefined();
    expect(state.canteenId).toBeNull();
  });

  it('reconciles with menu dropping sold out items and flagging price changes', () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen');
    useCartStore.getState().add(mockItem2, 'Main Canteen');

    const updatedMenu: MenuItem[] = [
      { ...mockItem1, isAvailable: false }, // sold out!
      { ...mockItem2, price: 18 },          // price increased from 15 to 18
    ];

    const { removed, priceChanged } = useCartStore.getState().reconcileWithMenu(updatedMenu);

    expect(removed).toHaveLength(1);
    expect(removed[0].id).toBe('item_1');

    expect(priceChanged).toHaveLength(1);
    expect(priceChanged[0].id).toBe('item_2');

    const state = useCartStore.getState();
    expect(state.lines['item_1']).toBeUndefined();
    expect(state.lines['item_2'].item.price).toBe(18);
    expect(state.lines['item_2'].priceChanged).toBe(true);
    expect(selectSubtotal(state)).toBe(18);
  });
});
