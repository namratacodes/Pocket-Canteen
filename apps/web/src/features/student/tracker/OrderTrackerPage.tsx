import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/lib/format';
import { useConnection } from '@/stores/connectionStore';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { useWalletLive } from '../wallet/useWallet';
import { canPromptNotifications, dismissNotificationPrompt, requestNotifications } from './alerts';
import { CancelOrderButton } from './CancelOrderButton';
import { EtaCountdown, EtaNotice } from './EtaCountdown';
import { PaymentPendingPanel } from './PaymentPendingPanel';
import { PickupCodeCard } from './PickupCodeCard';
import { ReorderButton } from '../orders/ReorderButton';
import { StepTracker } from './StepTracker';
import { statusView } from './statusView';
import { useOrderLive, useOrderQuery } from './useOrderLive';
import { useServerNow } from './useServerNow';
import './tracker.css';

const DevPanel = import.meta.env.DEV ? lazy(() => import('@/mocks/TrackerDevPanel')) : null;

function LiveDot() {
  const s = useConnection((x) => x.status);
  const [cls, label] = s === 'connected' ? ['bg-emerald-500', 'Live'] : s === 'reconnecting' ? ['bg-amber-500', 'Reconnecting'] : ['bg-red-500', 'Offline'];
  return <span className="flex items-center gap-1.5 text-xs font-medium"><span className={`h-2 w-2 rounded-full ${cls}`} aria-hidden />{label}</span>;
}

export function OrderTrackerPage() {
  const params = useParams();
  const id = params.orderId ?? params.id ?? '';
  const [sp] = useSearchParams();
  const fresh = sp.get('fresh') === '1';
  const showDev = sp.has('dev');

  const q = useOrderQuery(id);
  const order = q.data;
  const { walkCalled, etaNotice, dismissNotice } = useOrderLive(id, {
    onTerminal: (orderId) => usePickupCodeStore.getState().remove(orderId),
  });
  useWalletLive();
  const now = useServerNow();

  const [freshOn, setFreshOn] = useState(fresh);
  const [coach, setCoach] = useState(fresh);
  const [notifPrompt, setNotifPrompt] = useState(canPromptNotifications);

  useEffect(() => { usePickupCodeStore.getState().purgeExpired(); }, []);
  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setFreshOn(false), 1200);
    return () => clearTimeout(t);
  }, [fresh]);
  useEffect(() => {
    if (order && (order.status === 'completed' || order.status === 'cancelled')) usePickupCodeStore.getState().remove(order.id);
  }, [order]);

  let body: JSX.Element;
  if (!id || (q.isError && !order && (q.error as { status?: number })?.status === 404)) {
    body = <p className="py-16 text-center text-muted-foreground">We couldn&apos;t find that order.</p>;
  } else if (q.isError && !order) {
    body = (
      <div className="space-y-3 py-16 text-center">
        <p className="font-semibold">Could not load your order</p>
        <button type="button" onClick={() => void q.refetch()} className="h-12 rounded-lg bg-primary px-6 font-semibold text-primary-foreground">Retry</button>
      </div>
    );
  } else if (!order) {
    body = <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div>;
  } else {
    const view = statusView(order, walkCalled);
    const active = order.status !== 'completed' && order.status !== 'cancelled';
    const walletPart = order.walletAmountApplied > 0 ? `${formatINR(order.walletAmountApplied)} wallet` : '';
    const gatewayPart = order.gatewayAmount > 0 ? `${formatINR(order.gatewayAmount)} online` : '';
    const paidLine = [walletPart, gatewayPart].filter(Boolean).join(' + ') || formatINR(0);

    body = (
      <div className="space-y-5">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Your token</p>
          <p className="mx-auto mt-1 inline-block rounded-2xl border-2 border-primary px-8 py-2 font-mono text-6xl font-bold">{order.tokenNo}</p>
          <p className="mt-2 text-sm text-muted-foreground">{order.canteenName}{order.counterLabel ? ` · ${order.counterLabel}` : ''}</p>
        </div>

        {view.step > 0 && <StepTracker step={view.step} />}

        <h1 className="text-center text-xl font-bold" aria-live="polite">{view.headline}</h1>

        {order.status === 'cancelled' && (
          order.paymentStatus === 'failed' ? (
            <div role="alert" className="space-y-1 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center text-sm">
              <p className="font-semibold text-red-600">Payment not completed in time.</p>
              {order.walletAmountApplied > 0 && <p>Any wallet amount on hold ({formatINR(order.walletAmountApplied)}) has been released.</p>}
            </div>
          ) : (
            <div className="space-y-1 rounded-2xl border border-border bg-card p-4 text-center text-sm">
              {order.cancelReason && <p className="text-muted-foreground">{order.cancelReason}</p>}
              {(order.refundedAmount ?? 0) > 0 && (
                <p className="font-semibold">
                  {formatINR(order.refundedAmount!)} refunded to wallet.{' '}
                  <Link to="/student/wallet" className="text-primary underline">View wallet</Link>
                </p>
              )}
            </div>
          )
        )}

        {view.countdown === 'payment' && <PaymentPendingPanel order={order} nowMs={now} />}
        {(view.countdown === 'eta' || view.countdown === 'waiting') && <EtaCountdown order={order} nowMs={now} mode={view.countdown} />}
        {etaNotice && active && <EtaNotice notice={etaNotice} onDismiss={dismissNotice} />}

        {notifPrompt && active && view.code !== 'hidden' && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <Bell className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="flex-1">Get notified when food is ready?</p>
            <button type="button" className="h-10 rounded-lg bg-primary px-3 font-semibold text-primary-foreground"
              onClick={() => { setNotifPrompt(false); void requestNotifications(); }}>Enable</button>
            <button type="button" className="h-10 rounded-lg px-3 text-muted-foreground"
              onClick={() => { dismissNotificationPrompt(); setNotifPrompt(false); }}>Not now</button>
          </div>
        )}

        {coach && view.code === 'masked' && (
          <div role="note" className="flex items-start justify-between gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
            <p>Your pickup code is saved on this device. Show it at the counter to collect your order.</p>
            <button type="button" onClick={() => setCoach(false)} className="shrink-0 font-semibold text-primary">Got it</button>
          </div>
        )}

        {(view.code === 'masked' || view.code === 'revealed') && (
          <PickupCodeCard orderId={order.id} mode={view.code} large={order.status === 'ready'} />
        )}

        <div className="space-y-1 rounded-2xl border border-border bg-card p-4 text-sm">
          <p><span className="text-muted-foreground">Items: </span>{order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}</p>
          <p><span className="text-muted-foreground">Paid: </span>{paidLine}</p>
        </div>

        {view.showCancel && <CancelOrderButton order={order} />}

        {order.status === 'completed' && <ReorderButton order={order} />}
        {order.status === 'completed' && (
          <div className="grid grid-cols-2 gap-2">
            <Link to="/student" className="flex h-12 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground">Back home</Link>
            <Link to="/student/orders" className="flex h-12 items-center justify-center rounded-lg border border-border font-semibold">Order history</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-5 p-4 pb-24">
      {freshOn && (
        <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80" aria-hidden>
          <span className="pc-pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-10 w-10" /></span>
          <span className="pc-pop text-lg font-bold">Order placed!</span>
        </div>
      )}
      <header className="flex items-center justify-between">
        <Link to="/student/orders" aria-label="Back to orders" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted"><ArrowLeft className="h-5 w-5" /></Link>
        <span className="text-xs text-muted-foreground">{order?.orderUid}</span>
        <LiveDot />
      </header>
      {body}
      {DevPanel && showDev && <Suspense fallback={null}><DevPanel /></Suspense>}
    </main>
  );
}