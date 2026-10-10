import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitchenOrder } from '@/types/kitchen';

const api = vi.hoisted(() => ({ moveOrder: vi.fn() }));
vi.mock('@/lib/api/kitchenApi', () => ({ kitchenApi: api }));
vi.mock('@/stores/authStore', () => ({ useAuth: (sel: (s: unknown) => unknown) => sel({ user: { canteenId: 'c1' } }) }));

import * as db from '@/mocks/kitchenDb';
import { OrderTicket } from './OrderTicket';
import { useMoveOrder } from './useKitchenOrders';

const iso = (secAgo: number) => new Date(Date.now() - secAgo * 1000).toISOString();
const mk = (p: Partial<KitchenOrder>): KitchenOrder => ({
  id: 'o1', orderUid: 'u1', tokenNo: 'A-01', status: 'placed', paymentStatus: 'paid', studentName: 'Shubh K.',
  items: [{ menuItemId: 'm1', name: 'Samosa', quantity: 2, isVeg: true }], totalAmount: 40, estimatedPrepSeconds: 480,
  createdAt: iso(30), updatedAt: iso(30), verifyAttemptsLeft: 5, isLocked: false, ...p,
});
const h = { onMove: vi.fn(), onVerify: vi.fn(), onCancel: vi.fn(), onDetails: vi.fn() };
const ticket = (o: KitchenOrder, column: 'new' | 'preparing' | 'ready') =>
  render(<DndContext><OrderTicket order={o} column={column} {...h} /></DndContext>);

beforeEach(() => { vi.clearAllMocks(); db.resetKitchenDb(); });

describe('OrderTicket', () => {
  it('New: Start cooking moves to preparing', () => {
    ticket(mk({}), 'new');
    fireEvent.click(screen.getByRole('button', { name: /start cooking/i }));
    expect(h.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1' }), 'preparing');
  });
  it('Preparing: Mark ready, overdue badge when past ETA', () => {
    ticket(mk({ status: 'preparing', preparingAt: iso(600) }), 'preparing');
    expect(screen.getByText(/OVERDUE \+2m/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /mark ready/i }));
    expect(h.onMove).toHaveBeenCalledWith(expect.anything(), 'ready');
  });
  it('Ready: Verify & hand over, locked badge', () => {
    ticket(mk({ status: 'ready', readyAt: iso(60), isLocked: true }), 'ready');
    expect(screen.getByText('Locked')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /verify & hand over/i }));
    expect(h.onVerify).toHaveBeenCalled();
  });
});

describe('optimistic move', () => {
  it('rolls back when another device already moved the order', async () => {
    const qc = new QueryClient();
    qc.setQueryData(['kitchen', 'c1'], [mk({})]);
    api.moveOrder.mockRejectedValue(Object.assign(new Error('x'), { status: 409, code: 'INVALID_TRANSITION' }));
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useMoveOrder(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ id: 'o1', to: 'preparing', token: 'A-01' }).catch(() => undefined); });
    expect(qc.getQueryData<KitchenOrder[]>(['kitchen', 'c1'])![0].status).toBe('placed');
  });
});

describe('mock kitchen rules', () => {
  const run = (fn: () => unknown) => { try { fn(); return null; } catch (e) { return e as db.MockError; } };
  it('wrong code decrements, 4th quick call is rate limited', () => {
    const o = db.findByToken('A-09')!;
    const t = Date.now();
    const e1 = run(() => db.verifyPickup(o.id, '0000', t));
    expect(e1?.status).toBe(422);
    expect(e1?.details).toEqual({ attemptsLeft: 4 });
    run(() => db.verifyPickup(o.id, '0000', t + 100));
    run(() => db.verifyPickup(o.id, '0000', t + 200));
    expect(run(() => db.verifyPickup(o.id, '0000', t + 300))?.status).toBe(429);
  });
  it('locks after 5 wrong attempts and override completes it', () => {
    const o = db.findByToken('A-09')!;
    let last: db.MockError | null = null;
    for (let i = 0; i < 5; i++) last = run(() => db.verifyPickup(o.id, '0000', 10_000 * (i + 1)));
    expect(last?.status).toBe(423);
    expect(run(() => db.verifyPickup(o.id, '4721', 99_000))?.status).toBe(423);
    expect(run(() => db.overridePickup(o.id, '0000'))?.status).toBe(403);
    expect(db.overridePickup(o.id, db.MANAGER_PIN).order.status).toBe('completed');
  });
  it('correct code completes; not-ready and illegal moves are rejected', () => {
    const ready = db.findByToken('A-09')!;
    expect(db.verifyPickup(ready.id, '4721', 1).order.status).toBe('completed');
    const preparing = db.findByToken('A-10')!;
    expect(run(() => db.verifyPickup(preparing.id, '2468', 1))?.status).toBe(409);
    const fresh = db.findByToken('A-15')!;
    expect(run(() => db.moveOrder(fresh.id, 'ready'))?.code).toBe('INVALID_TRANSITION');
    expect(db.moveOrder(fresh.id, 'preparing').status).toBe('preparing');
  });
  it('cancel refunds the total and removes the order', () => {
    const o = db.findByToken('A-16')!;
    expect(db.cancelOrder(o.id).refundedAmount).toBe(o.totalAmount);
    expect(db.hasOrder(o.id)).toBe(false);
  });
});