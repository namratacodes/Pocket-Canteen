import { http, HttpResponse } from 'msw';
import menuData from '../fixtures/menu.json';
import type { MenuItem, ComboSuggestion } from '@/types';
import { mockSocket } from '../mockSocket';

export let mockMenuItems: Record<string, MenuItem[]> = JSON.parse(
  JSON.stringify(menuData.items)
);
export let mockCombos: Record<string, ComboSuggestion[]> = JSON.parse(
  JSON.stringify(menuData.combos)
);

export const resetMockMenu = () => {
  mockMenuItems = JSON.parse(JSON.stringify(menuData.items));
  mockCombos = JSON.parse(JSON.stringify(menuData.combos));
};

export const toggleItemAvailability = (canteenId: string, itemId: string) => {
  const items = mockMenuItems[canteenId];
  if (!items) return null;
  const item = items.find((i) => i.id === itemId);
  if (!item) return null;

  item.isAvailable = !item.isAvailable;

  // Emit socket event to mock listeners
  mockSocket.__serverEmit('menu:availability_changed', {
    menuItemId: item.id,
    isAvailable: item.isAvailable,
  });

  return item;
};

export const menuHandlers = [
  http.get('*/canteens/:id/menu', ({ params }) => {
    const { id } = params as { id: string };
    const items = mockMenuItems[id] || [];
    return HttpResponse.json(items);
  }),

  http.get('*/canteens/:id/combos', ({ params }) => {
    const { id } = params as { id: string };
    const combos = mockCombos[id] || [];
    return HttpResponse.json(combos);
  }),

  http.post('*/predict/eta-preview', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      canteenId?: string;
      items?: { menuItemId: string; quantity: number }[];
    };

    const items = body.items || [];
    let maxBasePrep = 180;
    if (body.canteenId && mockMenuItems[body.canteenId]) {
      const canteenMenu = mockMenuItems[body.canteenId];
      for (const line of items) {
        const found = canteenMenu.find((m) => m.id === line.menuItemId);
        if (found && found.basePrepSeconds) {
          maxBasePrep = Math.max(maxBasePrep, found.basePrepSeconds);
        }
      }
    }

    // Add 20% buffer + 60s per item over 2
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    const extraTime = Math.max(0, totalQty - 2) * 60;
    const estimatedPrepSeconds = Math.round(maxBasePrep * 1.2 + extraTime);

    return HttpResponse.json({ estimatedPrepSeconds });
  }),
];
