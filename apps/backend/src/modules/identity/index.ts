import type { BackendModule } from '../types';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import canteensRoutes from './canteens.routes';
import { cleanupExpired } from './job';
import meRoutes from './me.routes';

const identityModule: BackendModule = {
  name: 'identity',
  mount(router) {
    router.use(authRoutes);
    router.use(meRoutes);
    router.use(canteensRoutes);
    router.use(adminRoutes);
  },
  jobs: [
    {
      name: 'identityCleanup',
      cron: '0 0 * * * *',
      run: cleanupExpired,
    },
  ],
};

export default identityModule;
