import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrackedOrder } from './types';

const apiMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/staff/deps', () => ({ api: apiMock, useSocketEvent: () => undefined }));

import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { CancelOrderButton } from './CancelOrderButton';
import { PickupCodeCard } from './PickupCodeCard';
import { StepTracker } from './StepTracker';
import { statusView } from './statusView';
import { trackerKeys } from './keys';

const iso = () => new Date().toISOString();
const mk = (p: Partial<TrackedOrder>): TrackedOrder => ({
  id: 'o1', orderUid: 'u1', tokenNo: 'A-14', canteenId: 'c', canteenName: 'Main', counterLabel: 'Counter A',
  status: 'queued', paymentStatus: 'paid', items: [], totalAmount: 110, walletAmountApplied: 50, gatewayAmount: 60,
  estimatedPrepSeconds: 90, targetPickupTime: iso(), createdAt: iso(), updatedAt: iso(), ...p,
});

describe('statusView (every row of the status table)', () => {
  it('pending payment', () => {
    expect(statusView(mk({ paymentStatus: 'pending', status: 'placed' }))).toMatchObject({ headline: 'Waiting for payment', step: 0, countdown: 'payment', code: 'hidden', showRetry: true, showCancel: true });
  });
  it('received', () => {
    expect(statusView(mk({}))).toMatchObject({ headline: 'Order received 👍', step: 1, code: 'masked', showCancel: true });
  });
  it('preparing, then after call to walk', () => {
    expect(statusView(mk({ status: 'preparing' }))).toMatchObject({ headline: 'Chef is cooking 👨‍🍳', step: 2, code: 'masked', showCancel: false });
    expect(statusView(mk({ status: 'preparing' }), true)).toMatchObject({ headline: 'Head to Counter A now 🚶', step: 2, code: 'revealed' });
  });
  it('ready', () => {
    expect(statusView(mk({ status: 'ready' }))).toMatchObject({ headline: 'Ready! Collect at Counter A 🎉', step: 3, countdown: 'waiting', code: 'revealed' });
  });
  it('completed and cancelled', () => {
    expect(statusView(mk({ status: 'completed' }))).toMatchObject({ headline: 'Enjoy your meal! 😋', step: 5, code: 'removed' });
    expect(statusView(mk({ status: 'cancelled' }))).toMatchObject({ headline: 'Order cancelled', step: 0, code: 'removed' });
  });
});

describe('StepTracker', () => {
  it('marks the current step', () => {
    render(<StepTracker step={2} />);
    expect(screen.getByText('Preparing').closest('li')?.getAttribute('aria-current')).toBe('step');
    expect(screen.getByText('Received').closest('li')?.getAttribute('aria-current')).toBeNull();
  });
  it('no step is current once collected', () => {
    render(<StepTracker step={5} />);
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
  });
});

describe('PickupCodeCard', () => {
  beforeEach(() => { vi.useFakeTimers(); usePickupCodeStore.getState().clear(); });
  afterEach(() => vi.useRealTimers());

  it('is masked, reveals on Show, and re-masks after 10 seconds', () => {
    usePickupCodeStore.getState().save('o1', { code: '4721', tokenNo: 'A-14' });
    render(<PickupCodeCard orderId="o1" mode="masked" />);
    expect(screen.getByTestId('pickup-code').textContent).toBe('• • • •');
    fireEvent.click(screen.getByRole('button', { name: /show/i }));
    expect(screen.getByTestId('pickup-code').textContent).toBe('4 7 2 1');
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(screen.getByTestId('pickup-code').textContent).toBe('• • • •');
  });
  it('is revealed when mode is revealed', () => {
    usePickupCodeStore.getState().save('o1', { code: '4721', tokenNo: 'A-14' });
    render(<PickupCodeCard orderId="o1" mode="revealed" large />);
    expect(screen.getByTestId('pickup-code').textContent).toBe('4 7 2 1');
  });
  it('offers SMS when the code is missing, with a cooldown on 429', async () => {
    vi.useRealTimers();
    apiMock.mockRejectedValue({ status: 429, details: { retryAfterSec: 30 } });
    render(<PickupCodeCard orderId="nope" mode="masked" />);
    expect(screen.getByText('Code not saved on this device.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send code by SMS' }));
    expect(await screen.findByText('Try again in 30s')).toBeTruthy();
  });
});

describe('CancelOrderButton', () => {
  const setup = () => {
    const qc = new QueryClient();
    qc.setQueryData(trackerKeys.order('o1'), mk({}));
    render(<QueryClientProvider client={qc}><CancelOrderButton order={mk({})} /></QueryClientProvider>);
    return qc;
  };
  const doCancel = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cancel order' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel order' }));
  };

  it('rolls back when the kitchen already started', async () => {
    apiMock.mockRejectedValue({ status: 409, code: 'ALREADY_PREPARING' });
    const qc = setup();
    doCancel();
    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    await waitFor(() => expect(qc.getQueryData<TrackedOrder>(trackerKeys.order('o1'))?.status).toBe('queued'));
  });
  it('keeps the order cancelled on success', async () => {
    apiMock.mockResolvedValue({ order: mk({ status: 'cancelled', updatedAt: new Date(Date.now() + 5000).toISOString() }), refundedAmount: 110 });
    const qc = setup();
    doCancel();
    await waitFor(() => expect(qc.getQueryData<TrackedOrder>(trackerKeys.order('o1'))?.status).toBe('cancelled'));
  });
});