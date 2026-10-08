import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  Loader2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/common/Price';
import { VegDot } from '@/components/common/VegDot';
import { EmptyState } from '@/components/common/EmptyState';
import { WalletToggle } from './WalletToggle';
import { PaymentSummary } from './PaymentSummary';
import { useCreateOrder } from './useCreateOrder';
import { useCartStore, selectSubtotal, selectCount } from '@/stores/cartStore';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/queryKeys';
import { formatINR, formatTime } from '@/lib/format';
import type { Wallet } from '@/types';
import { useIsOnline } from '@/lib/network/useOnlineStatus';
import { setCheckoutActive } from '@/pwa/pwaStore';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const canteenId = useCartStore((state) => state.canteenId);
  const canteenName = useCartStore((state) => state.canteenName);
  const lines = useCartStore((state) => state.lines);
  const remove = useCartStore((state) => state.remove);
  const subtotal = useCartStore(selectSubtotal);
  const count = useCartStore(selectCount);
  const online = useIsOnline();

  // Hold the "new version available" message while the student is paying.
  useEffect(() => {
    setCheckoutActive(true);
    return () => setCheckoutActive(false);
  }, []);

  // Fetch live wallet balance
  const walletQuery = useQuery({
    queryKey: qk.wallet,
    queryFn: () => api<Wallet>('/wallet'),
    staleTime: 30000,
  });

  const walletBalance = walletQuery.data?.balance ?? 0;
  const [useWallet, setUseWallet] = useState(true);

  // ETA Preview query (optional, fails gracefully)
  const itemsList = useMemo(
    () =>
      Object.values(lines).map((l) => ({
        menuItemId: l.item.id,
        quantity: l.qty,
      })),
    [lines]
  );

  const etaQuery = useQuery({
    queryKey: ['eta-preview', canteenId, itemsList],
    queryFn: () =>
      api<{ estimatedPrepSeconds: number }>('/predict/eta-preview', {
        method: 'POST',
        json: { canteenId, items: itemsList },
      }),
    enabled: Boolean(canteenId && itemsList.length > 0),
    retry: false,
    staleTime: 60000,
  });

  const {
    step,
    isSubmitting,
    orderError,
    setOrderError,
    createOrder,
  } = useCreateOrder();

  // Split-pay maths (display only, server's numbers win after order creation)
  const walletApplied = useWallet ? Math.min(walletBalance, subtotal) : 0;
  const gatewayAmount = +(subtotal - walletApplied).toFixed(2);

  const etaSeconds = etaQuery.data?.estimatedPrepSeconds ?? 660; // 11 min fallback
  const etaMins = Math.ceil(etaSeconds / 60);
  const targetPickupDate = new Date(Date.now() + etaSeconds * 1000);

  const lineEntries = Object.values(lines);

  if (lineEntries.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          title="Your cart is empty"
          description="Looks like you haven't added any meals yet."
          action={
            <Button
              onClick={() => navigate('/student')}
              className="rounded-xl bg-brand text-white font-semibold"
            >
              Browse Canteens
            </Button>
          }
        />
      </div>
    );
  }

  const handlePlaceOrder = () => {
    createOrder({ useWallet });
  };

  const handleRemoveSoldOutAndContinue = (soldOutItemId: string) => {
    remove(soldOutItemId);
    setOrderError(null);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Header */}
      <div className="flex items-center gap-2.5 pt-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            canteenId ? navigate(`/student/c/${canteenId}`) : navigate('/student')
          }
          className="h-9 w-9 rounded-xl -ml-2 text-foreground hover:bg-muted"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Checkout
          </h1>
          <p className="text-xs text-muted-foreground">
            {canteenName} · Counter Pickup
          </p>
        </div>
      </div>

      {/* Error Banners */}
      {orderError && (
        <div className="rounded-2xl border border-destructive/40 bg-danger-soft p-4 space-y-2 text-destructive">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {orderError.code === 'ITEM_UNAVAILABLE'
                  ? 'Item Sold Out'
                  : orderError.code === 'CANTEEN_CLOSED'
                  ? 'Canteen Closed'
                  : orderError.code === 'NETWORK'
                  ? 'Order Not Confirmed'
                  : orderError.code === 'OFFLINE'
                  ? "You're Offline"
                  : 'Order Failed'}
              </h4>
              <p className="text-xs font-normal text-destructive/90 mt-0.5 leading-relaxed">
                {orderError.message}
              </p>
            </div>
          </div>

          {/* Action buttons inside error banner */}
          <div className="pt-1 flex gap-2">
            {orderError.code === 'ITEM_UNAVAILABLE' && orderError.details?.menuItemId && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  handleRemoveSoldOutAndContinue(orderError.details!.menuItemId)
                }
                className="h-8 px-3 rounded-lg text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                Remove & Continue
              </Button>
            )}

            {orderError.code === 'CANTEEN_CLOSED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/student')}
                className="h-8 px-3 rounded-lg text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                Return to Canteens
              </Button>
            )}

            {orderError.code === 'NETWORK' && (
              <Button
                size="sm"
                onClick={() => navigate('/student/orders')}
                className="h-8 px-3 rounded-lg text-xs font-semibold"
              >
                Check My Orders
              </Button>
            )}

            {orderError.code === 'NETWORK' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlaceOrder}
                disabled={!online}
                className="h-8 px-3 rounded-lg text-xs font-semibold border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Items Summary Card */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Order Items ({count})
          </h3>
          <span className="text-xs text-brand font-medium">Pickup order</span>
        </div>

        <div className="space-y-2.5">
          {lineEntries.map((line) => (
            <div
              key={line.item.id}
              className="flex items-center justify-between text-sm py-1"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <VegDot isVeg={Boolean(line.item.isVeg)} />
                <span className="text-foreground truncate font-medium">
                  {line.item.name}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  × {line.qty}
                </span>
              </div>
              <Price
                amount={+(line.item.price * line.qty).toFixed(2)}
                className="font-semibold text-foreground flex-shrink-0"
              />
            </div>
          ))}
        </div>
      </div>

      {/* ETA Preview Box */}
      {!etaQuery.isError && (
        <div className="rounded-2xl border border-info/20 bg-info-soft p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info flex-shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-info uppercase tracking-wide">
              Estimated Preparation
            </div>
            <div className="text-sm font-semibold text-foreground mt-0.5">
              Ready in about {etaMins} min{' '}
              <span className="text-xs font-normal text-muted-foreground">
                (around {formatTime(targetPickupDate.toISOString())})
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Toggle */}
      <WalletToggle
        balance={walletBalance}
        useWallet={useWallet}
        onToggle={setUseWallet}
      />

      {/* Payment Summary */}
      <PaymentSummary
        subtotal={subtotal}
        walletApplied={walletApplied}
        gatewayAmount={gatewayAmount}
      />

      {/* Cancellation Notice Banner */}
      <div className="rounded-xl bg-muted/60 p-3 flex items-start gap-2.5 text-muted-foreground text-xs leading-relaxed">
        <Info className="h-4 w-4 flex-shrink-0 text-brand mt-0.5" />
        <div>
          Cancel anytime before cooking starts for an{' '}
          <span className="font-semibold text-foreground">
            instant campus wallet refund
          </span>
          .
        </div>
      </div>

      {/* Sticky Bottom Action CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t border-border p-4 flex justify-center">
        <div className="w-full max-w-[448px]">
          <Button
            type="button"
            disabled={isSubmitting || !online}
            onClick={handlePlaceOrder}
            className="w-full h-14 rounded-2xl bg-brand text-white font-bold text-base shadow-float hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>
                  {step === 'verifying'
                    ? 'Verifying Payment…'
                    : 'Creating Order…'}
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>
                  {!online
                    ? 'Connect to order'
                    : gatewayAmount === 0
                    ? 'Place Order (Paid by Wallet)'
                    : `Pay ${formatINR(gatewayAmount)} & Place Order`}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
