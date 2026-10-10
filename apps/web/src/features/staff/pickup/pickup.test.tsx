import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KitchenOrder } from '@/types/kitchen';

const api = vi.hoisted(() => ({
  verifyPickup: vi.fn(),
  overridePickup: vi.fn(),
  cancelOrder: vi.fn(),
  setAvailability: vi.fn(),
}));
vi.mock('@/lib/api/kitchenApi', () => ({ kitchenApi: api }));
vi.mock('@/features/staff/board/useKitchenOrders', () => ({ useCanteenId: () => 'c1' }));

import { PickupVerifyModal } from './PickupVerifyModal';
import { CancelOrderDialog } from '../cancel/CancelOrderDialog';

const now = new Date().toISOString();
const order = {
  id: 'o9', orderUid: 'u9', tokenNo: 'A-09', status: 'ready', paymentStatus: 'paid', studentName: 'Riya S.',
  items: [{ menuItemId: 'm1', name: 'Cold Coffee', quantity: 1 }], totalAmount: 110, estimatedPrepSeconds: null,
  createdAt: now, updatedAt: now, verifyAttemptsLeft: 5, isLocked: false,
} as KitchenOrder;

const apiErr = (status: number, code: string, details?: object) => Object.assign(new Error(code), { status, code, details });
const wrap = (ui: React.ReactElement) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
const type = (digits: string) => { for (const d of digits) fireEvent.click(screen.getByRole('button', { name: d })); };
const openModal = () => wrap(<PickupVerifyModal open onOpenChange={() => undefined} orders={[order]} initialOrderId="o9" />);

beforeEach(() => vi.clearAllMocks());

describe('PickupVerifyModal', () => {
  it('auto-submits on the 4th digit and shows success', async () => {
    api.verifyPickup.mockResolvedValue({ order });
    openModal();
    type('4721');
    expect(await screen.findByText(/Hand over A-09/)).toBeTruthy();
    expect(api.verifyPickup).toHaveBeenCalledWith('o9', '4721');
  });

  it('wrong code shows attempts left and clears the boxes', async () => {
    api.verifyPickup.mockRejectedValue(apiErr(422, 'PICKUP_CODE_INVALID', { attemptsLeft: 3 }));
    openModal();
    type('1111');
    expect(await screen.findByText(/Incorrect · 3 attempts left/)).toBeTruthy();
    expect(screen.getAllByTestId('code-box').every((b) => b.textContent === '')).toBe(true);
  });

  it('423 shows the locked panel with manager override', async () => {
    api.verifyPickup.mockRejectedValue(apiErr(423, 'PICKUP_LOCKED'));
    openModal();
    type('1111');
    expect(await screen.findByText(/locked after 5 failed attempts/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manager override' })).toBeTruthy();
  });

  it('429 shows a countdown and disables the pad', async () => {
    api.verifyPickup.mockRejectedValue(apiErr(429, 'RATE_LIMITED', { retryAfterSec: 30 }));
    openModal();
    type('1111');
    expect(await screen.findByText(/Wait 30s/)).toBeTruthy();
    expect((screen.getByRole('button', { name: '5' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('409 shows the not-ready message', async () => {
    api.verifyPickup.mockRejectedValue(apiErr(409, 'NOT_READY'));
    openModal();
    type('1111');
    expect(await screen.findByText(/isn't marked Ready yet/)).toBeTruthy();
  });

  it('manager override with a wrong PIN shows an error', async () => {
    api.verifyPickup.mockRejectedValue(apiErr(423, 'PICKUP_LOCKED'));
    api.overridePickup.mockRejectedValue(apiErr(403, 'FORBIDDEN'));
    openModal();
    type('1111');
    fireEvent.click(await screen.findByRole('button', { name: 'Manager override' }));
    type('9999');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Wrong manager PIN')).toBeTruthy();
  });
});

describe('CancelOrderDialog', () => {
  const o = { ...order, id: 'o1', tokenNo: 'A-17', status: 'placed', totalAmount: 70,
    items: [{ menuItemId: 'm1', name: 'Masala Dosa', quantity: 1 }] } as KitchenOrder;
  const cancelBtn = () => screen.getByRole('button', { name: 'Cancel order' }) as HTMLButtonElement;

  it('requires a reason, and text for Other', () => {
    wrap(<CancelOrderDialog order={o} open onOpenChange={() => undefined} />);
    expect(cancelBtn().disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Other'));
    expect(cancelBtn().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Other reason'), { target: { value: 'Gas leak' } });
    expect(cancelBtn().disabled).toBe(false);
  });

  it('cancels, then marks ticked items sold out', async () => {
    api.cancelOrder.mockResolvedValue({ order: o, refundedAmount: 70 });
    api.setAvailability.mockResolvedValue({});
    wrap(<CancelOrderDialog order={o} open onOpenChange={() => undefined} />);
    fireEvent.click(screen.getByLabelText('Item out of stock'));
    fireEvent.click(screen.getByLabelText('Also mark "Masala Dosa" as sold out'));
    fireEvent.click(cancelBtn());
    await waitFor(() => expect(api.cancelOrder).toHaveBeenCalledWith('o1', 'Item out of stock'));
    await waitFor(() => expect(api.setAvailability).toHaveBeenCalledWith('m1', false));
  });
});