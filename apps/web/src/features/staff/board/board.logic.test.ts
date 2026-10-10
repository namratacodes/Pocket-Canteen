import { describe, expect, it } from 'vitest';
import { createBurstDebounce } from '@/lib/audio/audioService';
import { canMove, columnOf, groupOrders, summarizeItems } from './transitions';
import { timerInfo } from './timers';
import { isStaleEvent, upsertOrder, normalizeKitchenOrder } from './kitchenEvents';

const T0 = Date.parse('2026-10-10T10:00:00Z');
const iso = (secAgo: number) => new Date(T0 - secAgo * 1000).toISOString();
const mk = (p: object) => normalizeKitchenOrder({ id: 'o1', tokenNo: 'A-1', ...p } as never);

describe('transitions', () => {
  it('maps statuses to columns', () => {
    expect(columnOf('placed')).toBe('new');
    expect(columnOf('queued')).toBe('new');
    expect(columnOf('preparing')).toBe('preparing');
    expect(columnOf('ready')).toBe('ready');
    expect(columnOf('completed')).toBeNull();
  });
  it('allows only forward single steps', () => {
    expect(canMove('new', 'preparing')).toBe(true);
    expect(canMove('preparing', 'ready')).toBe(true);
    expect(canMove('new', 'ready')).toBe(false);
    expect(canMove('ready', 'preparing')).toBe(false);
    expect(canMove('preparing', 'new')).toBe(false);
  });
  it('sorts FIFO and summarizes items', () => {
    const a = mk({ id: 'a', createdAt: iso(10), items: [{ menuItemId: 's', name: 'Samosa', quantity: 2 }] });
    const b = mk({ id: 'b', createdAt: iso(60), items: [{ menuItemId: 's', name: 'Samosa', quantity: 3 }, { menuItemId: 'c', name: 'Chai', quantity: 1 }] });
    expect(groupOrders([a, b]).new.map((o) => o.id)).toEqual(['b', 'a']);
    expect(summarizeItems([a, b])).toEqual([{ name: 'Samosa', quantity: 5 }, { name: 'Chai', quantity: 1 }]);
  });
});

describe('timers', () => {
  it('New thresholds', () => {
    expect(timerInfo('new', mk({ createdAt: iso(60) }), T0).tone).toBe('ok');
    expect(timerInfo('new', mk({ createdAt: iso(121) }), T0).tone).toBe('amber');
    expect(timerInfo('new', mk({ createdAt: iso(301) }), T0).tone).toBe('red');
  });
  it('Preparing vs ETA', () => {
    const o = (s: number) => mk({ preparingAt: iso(s), estimatedPrepSeconds: 480 });
    expect(timerInfo('preparing', o(100), T0).tone).toBe('ok');
    expect(timerInfo('preparing', o(400), T0).tone).toBe('amber');
    const over = timerInfo('preparing', o(600), T0);
    expect(over.tone).toBe('red');
    expect(over.overdue).toBe(true);
    expect(over.label).toBe('OVERDUE +2m');
  });
  it('Ready thresholds', () => {
    expect(timerInfo('ready', mk({ readyAt: iso(301) }), T0).tone).toBe('amber');
    expect(timerInfo('ready', mk({ readyAt: iso(601) }), T0).tone).toBe('red');
  });
});

describe('kitchenEvents', () => {
  it('dedupes by id and ignores stale updates', () => {
    const o = mk({ updatedAt: iso(0), status: 'placed' });
    const once = upsertOrder([], o);
    expect(upsertOrder(once, o)).toHaveLength(1);
    const stale = mk({ updatedAt: iso(100), status: 'preparing' });
    expect(upsertOrder(once, stale)[0].status).toBe('placed');
    expect(isStaleEvent(iso(5), iso(1))).toBe(true);
  });
  it('removes terminal orders', () => {
    const o = mk({ status: 'placed' });
    expect(upsertOrder([o], mk({ status: 'completed' }))).toHaveLength(0);
  });
});

describe('audio debounce', () => {
  it('fires once per burst', () => {
    let t = 0, n = 0;
    const d = createBurstDebounce(() => n++, 1500, () => t);
    [0, 200, 400, 600, 800].forEach((x) => { t = x; d(); });
    expect(n).toBe(1);
    t = 3000; d();
    expect(n).toBe(2);
  });
});