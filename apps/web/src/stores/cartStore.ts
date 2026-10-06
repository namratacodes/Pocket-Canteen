import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MenuItem } from '@/types';

export interface CartLine {
  item: MenuItem;
  qty: number;
  priceChanged?: boolean;
}

export interface CartState {
  canteenId: string | null;
  canteenName: string | null;
  lines: Record<string, CartLine>;
  add: (item: MenuItem, canteenName: string) => 'added' | 'needs_switch';
  forceReplace: (item: MenuItem, canteenName: string) => void;
  inc: (id: string) => void;
  dec: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  reconcileWithMenu: (menuItems: MenuItem[]) => {
    removed: MenuItem[];
    priceChanged: MenuItem[];
  };
}

export const selectCount = (s: CartState): number =>
  Object.values(s.lines).reduce((a, l) => a + l.qty, 0);

export const selectSubtotal = (s: CartState): number =>
  Object.values(s.lines).reduce((a, l) => a + l.qty * l.item.price, 0);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      canteenId: null,
      canteenName: null,
      lines: {},

      add: (item, canteenName) => {
        const state = get();

        // 1. One canteen per cart rule
        if (state.canteenId && state.canteenId !== item.canteenId && Object.keys(state.lines).length > 0) {
          return 'needs_switch';
        }

        const currentLine = state.lines[item.id];
        const nextQty = currentLine ? Math.min(10, currentLine.qty + 1) : 1;

        set({
          canteenId: item.canteenId,
          canteenName,
          lines: {
            ...state.lines,
            [item.id]: {
              item,
              qty: nextQty,
            },
          },
        });

        return 'added';
      },

      forceReplace: (item, canteenName) => {
        set({
          canteenId: item.canteenId,
          canteenName,
          lines: {
            [item.id]: {
              item,
              qty: 1,
            },
          },
        });
      },

      inc: (id) => {
        const state = get();
        const line = state.lines[id];
        if (!line || line.qty >= 10) return;

        set({
          lines: {
            ...state.lines,
            [id]: {
              ...line,
              qty: line.qty + 1,
            },
          },
        });
      },

      dec: (id) => {
        const state = get();
        const line = state.lines[id];
        if (!line) return;

        if (line.qty > 1) {
          set({
            lines: {
              ...state.lines,
              [id]: {
                ...line,
                qty: line.qty - 1,
              },
            },
          });
        } else {
          const nextLines = { ...state.lines };
          delete nextLines[id];
          const hasRemaining = Object.keys(nextLines).length > 0;

          set({
            lines: nextLines,
            canteenId: hasRemaining ? state.canteenId : null,
            canteenName: hasRemaining ? state.canteenName : null,
          });
        }
      },

      remove: (id) => {
        const state = get();
        const nextLines = { ...state.lines };
        delete nextLines[id];
        const hasRemaining = Object.keys(nextLines).length > 0;

        set({
          lines: nextLines,
          canteenId: hasRemaining ? state.canteenId : null,
          canteenName: hasRemaining ? state.canteenName : null,
        });
      },

      clear: () => {
        set({
          canteenId: null,
          canteenName: null,
          lines: {},
        });
      },

      reconcileWithMenu: (menuItems) => {
        const state = get();
        const removed: MenuItem[] = [];
        const priceChanged: MenuItem[] = [];
        const nextLines: Record<string, CartLine> = {};

        const menuMap = new Map<string, MenuItem>(menuItems.map((m) => [m.id, m]));

        for (const [id, line] of Object.entries(state.lines)) {
          const menuItem = menuMap.get(id);
          if (!menuItem || !menuItem.isAvailable) {
            removed.push(line.item);
          } else {
            const hasPriceChanged = menuItem.price !== line.item.price;
            if (hasPriceChanged) {
              priceChanged.push(menuItem);
            }
            nextLines[id] = {
              item: menuItem,
              qty: line.qty,
              priceChanged: hasPriceChanged,
            };
          }
        }

        const hasRemaining = Object.keys(nextLines).length > 0;
        set({
          lines: nextLines,
          canteenId: hasRemaining ? state.canteenId : null,
          canteenName: hasRemaining ? state.canteenName : null,
        });

        return { removed, priceChanged };
      },
    }),
    {
      name: 'pc-cart-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
