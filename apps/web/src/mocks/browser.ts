import { setupWorker } from 'msw/browser';
import { authHandlers } from './handlers/auth';
import { canteensHandlers } from './handlers/canteens';
import { menuHandlers } from './handlers/menu';
import { walletHandlers } from './handlers/wallet';
import { ordersHandlers } from './handlers/orders';

export const worker = setupWorker(
  ...authHandlers,
  ...canteensHandlers,
  ...menuHandlers,
  ...walletHandlers,
  ...ordersHandlers
);
