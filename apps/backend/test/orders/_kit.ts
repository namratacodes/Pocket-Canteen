import { beforeEach } from 'vitest';
import ordersModule from '../../src/modules/orders';
import { appWith, makeCanteen, makeMenuItem, makeUser, resetDb, bearer } from '../helpers';
import { installFakes } from '../fakes';

export async function world() {
  await resetDb();
  const fakes = installFakes({ ledger: true, payments: true, eta: true });
  const api = appWith(ordersModule);
  const canteen = await makeCanteen();
  const other = await makeCanteen();
  const student = await makeUser('student');
  const student2 = await makeUser('student');
  const staff = await makeUser('staff', { canteenId: canteen.id });
  const staffB = await makeUser('staff', { canteenId: other.id });
  const admin = await makeUser('admin');
  const item = await makeMenuItem(canteen.id, { pricePaise: 5000 });
  const foreignItem = await makeMenuItem(other.id);
  const as = (u: Parameters<typeof bearer>[0]) => bearer(u);
  return { api, fakes, canteen, other, student, student2, staff, staffB, admin, item, foreignItem, as };
}
export type World = Awaited<ReturnType<typeof world>>;

let n = 0;
export const key = () => `idem-key-${Date.now()}-${n++}`;
export { beforeEach };

export const place = (w: World, o: { items?: { menuItemId: string; quantity: number }[]; useWallet?: boolean; k?: string; user?: any; canteenId?: string } = {}) =>
  w.api
    .post('/api/v1/orders')
    .set(w.as(o.user ?? w.student))
    .set('Idempotency-Key', o.k ?? key())
    .send({ canteenId: o.canteenId ?? w.canteen.id, items: o.items ?? [{ menuItemId: w.item.id, quantity: 2 }], ...(o.useWallet === undefined ? {} : { useWallet: o.useWallet }) });
