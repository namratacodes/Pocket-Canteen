import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Timer } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/features/staff/deps';
import { formatINR, formatMMSS } from '@/lib/format';
import { trackerKeys } from './keys';
import { remainingSeconds } from './countdown';
import type { TrackedOrder } from './types';

type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void };
const getRazorpay = () => (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;

function loadRazorpay(): Promise<boolean> {
  if (getRazorpay()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PaymentPendingPanel({ order, nowMs }: { order: TrackedOrder; nowMs: number }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const remaining = order.paymentExpiresAt ? remainingSeconds(order.paymentExpiresAt, nowMs) : 0;
  const isExpired = expired || (!!order.paymentExpiresAt && remaining <= 0);
  const refresh = () => qc.invalidateQueries({ queryKey: trackerKeys.order(order.id) });

  const retry = async () => {
    setBusy(true);
    try {
      const { razorpay } = await api<{ razorpay: { orderId: string; amount: number; currency: string; keyId: string } }>(
        `/orders/${order.id}/payment/retry`, { method: 'POST' },
      );
      if (razorpay.keyId === 'mock') { await refresh(); return; } // mock server: payment succeeds instantly
      if (!(await loadRazorpay())) { toast.error('Could not open the payment window. Check your connection'); return; }
      const Rz = getRazorpay()!;
      new Rz({
        key: razorpay.keyId, order_id: razorpay.orderId, amount: razorpay.amount, currency: razorpay.currency,
        name: 'Pocket Canteen', handler: () => { void refresh(); },
      }).open();
    } catch (e) {
      const err = e as { status?: number; code?: string };
      if (err.status === 410 || err.code === 'PAYMENT_EXPIRED') setExpired(true);
      else toast.error('Could not start the payment. Try again');
    } finally {
      setBusy(false);
    }
  };

  if (isExpired) {
    return (
      <div role="alert" className="space-y-1 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center text-sm">
        <p className="font-semibold text-red-600">Payment not completed in time.</p>
        {order.walletAmountApplied > 0 && <p>Any wallet amount on hold ({formatINR(order.walletAmountApplied)}) has been released.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center">
      <p className="flex items-center justify-center gap-2 text-sm font-medium"><Timer className="h-4 w-4" aria-hidden /> Complete payment within</p>
      <p className="text-3xl font-bold tabular-nums">{formatMMSS(remaining)}</p>
      <button type="button" onClick={retry} disabled={busy} className="h-12 w-full rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? 'Opening…' : `Retry payment · ${formatINR(order.gatewayAmount)}`}
      </button>
    </div>
  );
}