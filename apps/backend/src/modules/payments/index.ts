import express from 'express';
import { container } from '../../container';
import { wrap } from '../../middleware/asyncHandler';
import type { BackendModule } from '../types';
import confirmRoutes from './confirm.routes';
import devRoutes, { devEnabled } from './dev.routes';
import { expirePendingOrders } from './expire.job';
import { paymentService } from './payment.service';
import { webhookHandler } from './webhook.controller';

const paymentsModule: BackendModule = {
  name: 'payments',
  register() {
    container.register('payments', paymentService);
  },
  mountRaw(app) {
    app.post('/api/v1/webhooks/razorpay', express.raw({ type: 'application/json' }), wrap(webhookHandler));
  },
  mount(router) {
    router.use(confirmRoutes);
    if (devEnabled()) router.use(devRoutes);
  },
  jobs: [{ name: 'expirePendingOrders', cron: '0 * * * * *', run: expirePendingOrders }],
};
export default paymentsModule;
