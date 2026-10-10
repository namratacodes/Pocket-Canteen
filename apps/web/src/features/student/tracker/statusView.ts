import type { TrackedOrder } from './types';

export interface StatusView {
  headline: string;
  step: 0 | 1 | 2 | 3 | 5; // 0 = no tracker, 5 = all steps done
  countdown: 'payment' | 'eta' | 'waiting' | 'none';
  code: 'hidden' | 'masked' | 'revealed' | 'removed';
  showCancel: boolean;
  showRetry: boolean;
}

export function statusView(o: TrackedOrder, walkCalled = false): StatusView {
  const counter = o.counterLabel ?? 'the counter';
  const base = { showCancel: false, showRetry: false };
  if (o.status === 'cancelled') return { ...base, headline: 'Order cancelled', step: 0, countdown: 'none', code: 'removed' };
  if (o.status === 'completed') return { ...base, headline: 'Enjoy your meal! 😋', step: 5, countdown: 'none', code: 'removed' };
  if (o.paymentStatus === 'pending') {
    return { headline: 'Waiting for payment', step: 0, countdown: 'payment', code: 'hidden', showCancel: true, showRetry: true };
  }
  if (o.status === 'ready') return { ...base, headline: `Ready! Collect at ${counter} 🎉`, step: 3, countdown: 'waiting', code: 'revealed' };
  if (walkCalled) return { ...base, headline: `Head to ${counter} now 🚶`, step: 2, countdown: 'eta', code: 'revealed' };
  if (o.status === 'preparing') return { ...base, headline: 'Chef is cooking 👨‍🍳', step: 2, countdown: 'eta', code: 'masked' };
  return { headline: 'Order received 👍', step: 1, countdown: 'eta', code: 'masked', showCancel: true, showRetry: false };
}