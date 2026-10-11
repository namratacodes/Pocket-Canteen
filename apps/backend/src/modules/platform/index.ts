import type { Server } from 'socket.io';
import { container } from '../../container';
import { wrap } from '../../middleware/asyncHandler';
import type { BackendModule } from '../types';
import { etaService } from './eta/eta.service';
import { healthHandler, readyHandler } from './health';
import { etaTicker, stuckOrderWatch } from './jobs';
import queueRoutes from './queue.routes';
import { attachSocketServer } from './socket';

let io: Server | undefined;

const platformModule: BackendModule = {
  name: 'platform',
  register() {
    container.register('eta', etaService);
  },
  mountRaw(app) {
    app.get('/health', healthHandler);
    app.get('/ready', wrap(readyHandler));
  },
  mount(router) {
    router.use(queueRoutes);
  },
  onStart({ server }) {
    io = attachSocketServer(server);
  },
  onStop() {
    io?.close();
  },
  jobs: [
    { name: 'etaTicker', cron: '*/30 * * * * *', run: etaTicker },
    { name: 'stuckOrderWatch', cron: '0 */5 * * * *', run: stuckOrderWatch },
  ],
};
export default platformModule;
