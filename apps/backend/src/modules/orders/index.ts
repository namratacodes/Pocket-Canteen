import { container } from '../../container';
import type { BackendModule } from '../types';
import studentOrderRoutes from './order.routes';
import { ordersService } from './order.service';
import staffOrderRoutes from './staff.routes';

const ordersModule: BackendModule = {
  name: 'orders',
  register() {
    container.register('orders', ordersService);
  },
  mount(router) {
    router.use(studentOrderRoutes);
    router.use(staffOrderRoutes);
  },
};
export default ordersModule;
