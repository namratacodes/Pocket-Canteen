import type { KitchenOrder, KitchenOrderItem, StaffMenuItem } from '@/types/kitchen';

export class MockError extends Error {
  constructor(public status: number, public code: string, public details?: Record<string, unknown>) { super(code); }
}

export const MANAGER_PIN = '1234';
const ago = (s: number) => new Date(Date.now() - s * 1000).toISOString();
const m = (id: string, name: string, category: string, price: number, isVeg = true): StaffMenuItem => ({
  id, name, category, price, isVeg, isAvailable: true, updatedAt: ago(3600),
});

const MENU_SEED: StaffMenuItem[] = [
  m('km_samosa', 'Samosa (2 pc)', 'Snacks', 20), m('km_puff', 'Veg Puff', 'Snacks', 25),
  m('km_chai', 'Masala Chai', 'Beverages', 15), m('km_filter', 'Filter Coffee', 'Beverages', 30), m('km_cold', 'Cold Coffee', 'Beverages', 50),
  m('km_dosa', 'Masala Dosa', 'South Indian', 60), m('km_idli', 'Idli Sambar', 'South Indian', 40),
  m('km_sand', 'Veg Sandwich', 'Snacks', 45), m('km_roll', 'Chicken Roll', 'Rolls', 70, false),
];

let menu: StaffMenuItem[] = [];
let orders: KitchenOrder[] = [];
let codes = new Map<string, string>();
let calls = new Map<string, number[]>();
let nextToken = 18;
let canteenOpen = true;

const line = (menuId: string, quantity: number): KitchenOrderItem => {
  const it = MENU_SEED.find((x) => x.id === menuId)!;
  return { menuItemId: it.id, name: it.name, quantity, isVeg: it.isVeg };
};
const total = (items: KitchenOrderItem[]) => items.reduce((s, i) => s + i.quantity * (MENU_SEED.find((x) => x.id === i.menuItemId)?.price ?? 0), 0);

function make(n: number, status: KitchenOrder['status'], items: KitchenOrderItem[], who: string, times: { created: number; preparing?: number; ready?: number }, eta: number | null, code: string): KitchenOrder {
  const token = `A-${String(n).padStart(2, '0')}`;
  const o: KitchenOrder = {
    id: `ko_${token}`, orderUid: `uid_${token}`, tokenNo: token, status, paymentStatus: 'paid', studentName: who,
    items, totalAmount: total(items), estimatedPrepSeconds: eta,
    createdAt: ago(times.created),
    preparingAt: times.preparing !== undefined ? ago(times.preparing) : undefined,
    readyAt: times.ready !== undefined ? ago(times.ready) : undefined,
    updatedAt: ago(Math.min(times.created, times.preparing ?? 1e9, times.ready ?? 1e9)),
    verifyAttemptsLeft: 5, isLocked: false,
  };
  codes.set(o.id, code);
  return o;
}

export function resetKitchenDb() {
  menu = MENU_SEED.map((x) => ({ ...x }));
  codes = new Map(); calls = new Map(); nextToken = 18; canteenOpen = true;
  orders = [
    make(15, 'placed', [line('km_samosa', 2), line('km_chai', 1)], 'Shubh K.', { created: 40 }, 420, '6802'),
    make(16, 'placed', [line('km_dosa', 1)], 'Aman P.', { created: 150 }, 600, '7913'),
    make(17, 'placed', [line('km_dosa', 1), line('km_filter', 1)], 'Neha R.', { created: 90 }, 600, '8024'),
    make(10, 'preparing', [line('km_idli', 2)], 'Kabir S.', { created: 400, preparing: 180 }, 480, '2468'),
    make(11, 'preparing', [line('km_puff', 2), line('km_chai', 2)], 'Isha M.', { created: 500, preparing: 400 }, 480, '3579'),
    make(12, 'preparing', [line('km_dosa', 1), line('km_filter', 1)], 'Rohan D.', { created: 800, preparing: 660 }, 480, '4680'),
    make(13, 'preparing', [line('km_roll', 1)], 'Tara N.', { created: 120, preparing: 60 }, 600, '5791'),
    make(8, 'ready', [line('km_samosa', 3)], 'Dev A.', { created: 1200, preparing: 1000, ready: 720 }, 420, '1357'),
    make(9, 'ready', [line('km_cold', 1), line('km_sand', 1)], 'Riya S.', { created: 600, preparing: 400, ready: 120 }, 480, '4721'),
  ];
}
resetKitchenDb();

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const byId = (id: string) => orders.find((o) => o.id === id);
export const findByToken = (token: string) => orders.find((o) => o.tokenNo === token);
export const hasOrder = (id: string) => !!byId(id);
export const hasMenuItem = (id: string) => menu.some((i) => i.id === id);

export const listOrders = () => clone(orders);
export const listMenu = () => clone(menu);
export const summary = () => ({ ordersToday: 120 + orders.length, avgPrepMins: 9.2, isRush: orders.length >= 8, isOpen: canteenOpen });
export const setOpen = (v: boolean) => { canteenOpen = v; return { isOpen: v }; };

export function moveOrder(id: string, to: 'preparing' | 'ready', now = Date.now()) {
  const o = byId(id);
  if (!o) throw new MockError(404, 'NOT_FOUND');
  const ok = (to === 'preparing' && (o.status === 'placed' || o.status === 'queued')) || (to === 'ready' && o.status === 'preparing');
  if (!ok) throw new MockError(409, 'INVALID_TRANSITION');
  const iso = new Date(now).toISOString();
  o.status = to; o.updatedAt = iso;
  if (to === 'preparing') o.preparingAt = iso; else o.readyAt = iso;
  return clone(o);
}

const complete = (o: KitchenOrder) => {
  o.status = 'completed'; o.updatedAt = new Date().toISOString();
  orders = orders.filter((x) => x.id !== o.id);
  return clone(o);
};

export function verifyPickup(id: string, code: string, now = Date.now()) {
  const o = byId(id);
  if (!o) throw new MockError(404, 'NOT_FOUND');
  if (o.status !== 'ready') throw new MockError(409, 'NOT_READY');
  if (o.isLocked) throw new MockError(423, 'PICKUP_LOCKED');
  const recent = (calls.get(id) ?? []).filter((t) => now - t < 5000);
  recent.push(now); calls.set(id, recent);
  if (recent.length > 3) throw new MockError(429, 'RATE_LIMITED', { retryAfterSec: 30 });
  if (code !== codes.get(id)) {
    o.verifyAttemptsLeft = Math.max(0, o.verifyAttemptsLeft - 1);
    if (o.verifyAttemptsLeft === 0) { o.isLocked = true; throw new MockError(423, 'PICKUP_LOCKED'); }
    throw new MockError(422, 'PICKUP_CODE_INVALID', { attemptsLeft: o.verifyAttemptsLeft });
  }
  return { order: complete(o) };
}

export function overridePickup(id: string, pin: string) {
  const o = byId(id);
  if (!o) throw new MockError(404, 'NOT_FOUND');
  if (pin !== MANAGER_PIN) throw new MockError(403, 'FORBIDDEN');
  return { order: complete(o) };
}

export function cancelOrder(id: string) {
  const o = byId(id);
  if (!o) throw new MockError(404, 'NOT_FOUND');
  o.status = 'cancelled';
  orders = orders.filter((x) => x.id !== id);
  return { order: clone(o), refundedAmount: o.totalAmount };
}

export function setAvailability(id: string, isAvailable: boolean) {
  const it = menu.find((i) => i.id === id);
  if (!it) throw new MockError(404, 'NOT_FOUND');
  it.isAvailable = isAvailable; it.updatedBy = 'Ramesh'; it.updatedAt = new Date().toISOString();
  return clone(it);
}

export function addRandomOrder(): KitchenOrder {
  const pick = () => MENU_SEED[Math.floor(Math.random() * MENU_SEED.length)].id;
  const items = [line(pick(), 1 + Math.floor(Math.random() * 2)), line(pick(), 1)].filter((x, i, a) => a.findIndex((y) => y.menuItemId === x.menuItemId) === i);
  const code = String(1000 + Math.floor(Math.random() * 9000));
  const o = make(nextToken++, 'placed', items, ['Meera T.', 'Sahil B.', 'Priya L.', 'Arjun V.'][Math.floor(Math.random() * 4)], { created: 0 }, 480, code);
  orders.push(o);
  return clone(o);
}

export function moveByOtherTablet(token: string) {
  const o = findByToken(token);
  return o?.status === 'preparing' ? moveOrder(o.id, 'ready') : null;
}

export function cancelByStudent(token: string) {
  const o = findByToken(token) ?? orders.find((x) => x.status === 'placed');
  if (!o) return null;
  cancelOrder(o.id);
  return o.id;
}

export const devCodes = () => orders.map((o) => ({ token: o.tokenNo, status: o.status, code: codes.get(o.id) ?? '', locked: o.isLocked }));