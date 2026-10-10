import { analyticsHandlers } from './handlers/analytics';
import { adminHandlers } from './handlers/admin';
import { setupWorker } from 'msw/browser';
import { viteSourceGuard } from './handlers/viteGuard';
import { authHandlers } from './handlers/auth';
import { canteensHandlers } from './handlers/canteens';
import { menuHandlers } from './handlers/menu';
import { walletHandlers } from './handlers/wallet';
import { ordersHandlers } from './handlers/orders';
import { kitchenHandlers } from './handlers/kitchen';
import { trackerHandlers } from './handlers/tracker';

export const worker = setupWorker(
  viteSourceGuard,
  ...trackerHandlers, ...kitchenHandlers, ...adminHandlers,
  ...analyticsHandlers,
  ...authHandlers,
  ...canteensHandlers,
  ...menuHandlers,
  ...walletHandlers,
  ...ordersHandlers
);
