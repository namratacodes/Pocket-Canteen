import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LedgerEntry, TrackedOrder } from '../tracker/types';

const m = vi.hoisted(() => ({
  active: { data: [] as unknown[], isLoading: false, isError: false, refetch: vi.fn() },
  past: { data: { pages: [] as { items: unknown[]; nextCursor: string | null }[] }, isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn(), refetch: vi.fn() },
  ledger: { data: { pages: [] as { items: unknown[]; nextCursor: string | null }[] }, isLoading: false, isError: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn(), refetch: vi.fn() },
  wallet: { data: { balance: 160, updatedAt: '' } as { balance: number; updatedAt: string } | undefined, isLoading: false, isError: false },
  reorder: vi.fn(),
}));
vi.mock('./useOrders', () => ({ useActiveOrders: () => m.active, usePastOrders: () => m.past, useActiveOrdersLive: () => undefined }));
vi.mock('./useReorder', () => ({ useReorder: () => ({ reorder: m.reorder, busyId: null }) }));
vi.mock('../wallet/useWallet', () => ({ useLedger: () => m.ledger, useWallet: () => m.wallet, useWalletLive: () => undefined }));

import { flattenMenu, planReorder } from './reorderPlan';
import { dayLabel, statusLabel } from './orderLabels';
import { OrderHistoryPage } from './OrderHistoryPage';
import { ActiveOrderBanner } from './ActiveOrderBanner';
import { BalanceCard } from '../wallet/BalanceCard';
import { LedgerList } from '../wallet/LedgerList';

const iso = () => new Date().toISOString();
const mk = (p: Partial<TrackedOrder>): TrackedOrder => ({
  id: 'o1', orderUid: 'u1', tokenNo: 'A-14', canteenId: 'c1', canteenName: 'Main Canteen', status: 'preparing', paymentStatus: 'paid',
  items: [{ menuItemId: 'm1', name: 'Samosa', quantity: 2, priceAtOrderTime: 20 }, { menuItemId: 'm2', name: 'Chicken Roll', quantity: 1, priceAtOrderTime: 70 }],
  totalAmount: 110, walletAmountApplied: 0, gatewayAmount: 110, estimatedPrepSeconds: 90, targetPickupTime: iso(), createdAt: iso(), updatedAt: iso(), ...p,
});
const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); m.active.data = []; m.past.data = { pages: [] }; m.ledger.data = { pages: [] }; });

describe('labels and reorder planning', () => {
  it('labels every state', () => {
    expect(statusLabel({ status: 'queued', paymentStatus: 'paid' })).toBe('Received');
    expect(statusLabel({ status: 'preparing', paymentStatus: 'paid' })).toBe('Preparing');
    expect(statusLabel({ status: 'completed', paymentStatus: 'paid' })).toBe('Collected');
    expect(statusLabel({ status: 'cancelled', paymentStatus: 'refunded_to_wallet' })).toBe('Cancelled');
    expect(statusLabel({ status: 'placed', paymentStatus: 'pending' })).toBe('Awaiting payment');
    expect(dayLabel(new Date().toISOString())).toMatch(/^Today /);
  });
  it('finds menu items in any nesting and skips unavailable ones', () => {
    const menu = flattenMenu({ canteen: { id: 'c1', name: 'Main' }, categories: [
      { id: 'cat', name: 'Snacks', items: [{ id: 'm1', name: 'Samosa', price: 20, isAvailable: true }, { id: 'm2', name: 'Chicken Roll', price: 70, isAvailable: false }] },
    ] });
    expect(menu.map((x) => x.id)).toEqual(['m1', 'm2']);
    const plan = planReorder(mk({}), menu);
    expect(plan.add).toMatchObject([{ menuItemId: 'm1', name: 'Samosa', price: 20, quantity: 2 }]);
    expect(plan.skipped).toEqual(['Chicken Roll']);
  });
});

describe('OrderHistoryPage', () => {
  it('shows the active empty state', () => {
    wrap(<OrderHistoryPage />);
    expect(screen.getByText(/No active orders/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse canteens' })).toBeTruthy();
  });
  it('shows active orders and the count', () => {
    m.active.data = [mk({})];
    wrap(<OrderHistoryPage />);
    expect(screen.getByRole('tab', { name: 'Active (1)' })).toBeTruthy();
    expect(screen.getByText('Samosa ×2, Chicken Roll ×1')).toBeTruthy();
  });
  it('past tab: Reorder only on collected orders; cancelled shows refund', () => {
    m.past.data = { pages: [{ items: [mk({ id: 'p1', status: 'completed' }), mk({ id: 'p2', tokenNo: 'A-03', status: 'cancelled', paymentStatus: 'refunded_to_wallet', refundedAmount: 60 })], nextCursor: null }] };
    wrap(<OrderHistoryPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Past' }));
    expect(screen.getAllByRole('button', { name: 'Reorder' })).toHaveLength(1);
    expect(screen.getByText(/refunded/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reorder' }));
    expect(m.reorder).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });
  it('past tab empty state', () => {
    wrap(<OrderHistoryPage />);
    fireEvent.click(screen.getByRole('tab', { name: 'Past' }));
    expect(screen.getByText('No past orders yet')).toBeTruthy();
  });
});

describe('ActiveOrderBanner', () => {
  it('renders nothing with no active orders', () => {
    const { container } = wrap(<ActiveOrderBanner />);
    expect(container.textContent).toBe('');
  });
  it('shows max 2 rows then a +N more link', () => {
    m.active.data = [mk({ id: 'a' }), mk({ id: 'b', tokenNo: 'A-15' }), mk({ id: 'c', tokenNo: 'A-16' })];
    wrap(<ActiveOrderBanner />);
    expect(screen.getByText('+1 more')).toBeTruthy();
    expect(screen.queryByText('A-16')).toBeNull();
  });
});

describe('wallet', () => {
  const e = (id: number, entryType: LedgerEntry['entryType'], amount: number): LedgerEntry => ({
    id, entryType, amount, orderUid: 'U1', reason: 'r', balanceAfter: 100, createdAt: iso(),
  });
  it('balance shows immediately', () => {
    wrap(<BalanceCard />);
    expect(screen.getByTestId('wallet-balance').textContent).toContain('160');
  });
  it('ledger shows signs and the Today group', () => {
    m.ledger.data = { pages: [{ items: [e(2, 'refund_credit', 110), e(1, 'checkout_capture', -50)], nextCursor: null }] };
    wrap(<LedgerList />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText(/^\+/).textContent).toContain('110');
    expect(screen.getByText(/^−/).textContent).toContain('50');
  });
  it('ledger empty state', () => {
    wrap(<LedgerList />);
    expect(screen.getByText('No transactions yet')).toBeTruthy();
  });
});