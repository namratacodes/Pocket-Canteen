import type { BackendModule } from '../types';
import analyticsRoutes from './analytics.routes';
import canteenStatusRoutes from './canteenStatus.routes';
import menuRoutes from './menu.routes';

const catalogModule: BackendModule = {
  name: 'catalog',
  mount(router) {
    router.use(menuRoutes);
    router.use(canteenStatusRoutes);
    router.use(analyticsRoutes);
  },
};

export default catalogModule;
