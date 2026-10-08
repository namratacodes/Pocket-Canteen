import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock,
  KeyRound,
  RefreshCw,
  Home,
  ReceiptText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TokenChip } from '@/components/common/TokenChip';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Price } from '@/components/common/Price';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import { ErrorState } from '@/components/common/ErrorState';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { openCheckout } from '@/lib/payments/razorpay';
import { api, ApiError } from '@/lib/api/client';
import { qk } from '@/lib/api/queryKeys';
import { formatTime, formatDate, formatINR } from '@/lib/format';
import { useIsOnline } from '@/lib/network/useOnlineStatus';
import { PickupCodeFallback } from './PickupCodeFallback';
import type { Order } from '@/types';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId = '' } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isFresh = searchParams.get('fresh') === '1';
  const isPendingQuery = searchParams.get('pending') === '1';
  const online = useIsOnline();

  const storedCodeData = usePickupCodeStore((state) => state.getCode(orderId));
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  // Fetch live order data
  const {
    data: order,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: qk.order(orderId),
    queryFn: () => api<Order>(`/orders/${orderId}`),
    refetchInterval: (query) => {
      // Poll every 5s if payment is pending
      const ord = query.state.data;
      return ord?.paymentStatus === 'pending' ? 5000 : false;
    },
  });

  const handleRetryPayment = async () => {
    if (!order) return;
    setIsRetryingPayment(true);

    try {
      const res = await api<{
        razorpay: {
          orderId: string;
          amount: number;
          currency: string;
          keyId: string;
        };
      }>(`/orders/${orderId}/payment/retry`, {
        method: 'POST',
      });

      await openCheckout({
        keyId: res.razorpay.keyId,
        orderId: res.razorpay.orderId,
        amount: res.razorpay.amount,
        currency: 'INR',
        name: order.canteenName,
        description: `Retry Payment · ${order.tokenNo}`,
        themeColor: '#F97316',
        onSuccess: async (p) => {
          await api('/payments/verify', {
            method: 'POST',
            json: { orderId: order.id, ...p },
          });
          toast.success('Payment completed successfully!');
          queryClient.invalidateQueries({ queryKey: qk.order(orderId) });
        },
        onDismiss: () => {
          toast.info('Payment window was closed.');
        },
        onFailure: () => {
          toast.error('Payment failed. You can retry again.');
        },
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize payment retry.');
    } finally {
      setIsRetryingPayment(false);
    }
  };

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if ((isError || !order) && storedCodeData) {
    // The pickup code lives on this phone, so it stays visible even when the order can't be loaded.
    return (
      <div className="space-y-4 pb-12">
        <PickupCodeFallback
          tokenNo={storedCodeData.tokenNo}
          code={storedCodeData.code}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="py-8">
        <ErrorState
          error={error as ApiError | Error}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const isPaymentPending = order.paymentStatus === 'pending' || isPendingQuery;
  const pickupCode = storedCodeData?.code ?? '••••';

  return (
    <div className="space-y-4 pb-12">
      {!online && (
        <div
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900"
        >
          Offline. This is the last saved status. It will update when you're back online.
        </div>
      )}

      {/* Fresh Order Celebration Banner */}
      {isFresh && !isPaymentPending && (
        <div className="rounded-2xl border border-success/30 bg-success-soft p-4 flex items-center gap-3 text-success animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success text-white flex-shrink-0 shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">
              Order Confirmed!
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your food will be prepared fresh at {order.canteenName}.
            </p>
          </div>
        </div>
      )}

      {/* Payment Pending Alert */}
      {isPaymentPending && (
        <div className="rounded-2xl border border-warning/40 bg-warning-soft p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Payment Pending
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                We haven't received your payment yet. Complete payment now so the kitchen can begin preparing your order.
              </p>
            </div>
          </div>

          <Button
            type="button"
            disabled={isRetryingPayment || !online}
            onClick={handleRetryPayment}
            className="w-full h-11 rounded-xl bg-brand text-white font-semibold text-xs shadow-sm hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
          >
            {isRetryingPayment ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Opening Gateway…</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>Retry Payment ({formatINR(order.gatewayAmount)})</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Flagship Token & Pickup Code Card */}
      <Card className="rounded-2xl border border-border shadow-card overflow-hidden text-center">
        <CardContent className="p-6 space-y-5">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Your Counter Token
            </span>
            <div className="pt-2 flex justify-center">
              <TokenChip token={order.tokenNo} size="xl" />
            </div>
            <p className="text-xs font-medium text-muted-foreground pt-1">
              {order.canteenName} · Counter Pickup
            </p>
          </div>

          {/* Pickup Code Display */}
          <div className="rounded-2xl bg-muted/50 border border-border/80 p-4 space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <KeyRound className="h-4 w-4 text-brand" />
              <span>4-Digit Pickup Code</span>
            </div>

            <div className="font-mono text-4xl font-bold tracking-[0.4em] text-foreground tabular-nums select-all">
              {pickupCode}
            </div>

            <p className="text-[11px] text-muted-foreground">
              Show this code to canteen staff when you collect your food
            </p>
          </div>

          {/* ETA / Target Time */}
          {order.targetPickupTime && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground">
              <Clock className="h-4 w-4 text-brand" />
              <span>Ready around {formatTime(order.targetPickupTime)}</span>
            </div>
          )}

          <div className="pt-1 flex justify-center">
            <StatusBadge
              status={order.status}
              paymentStatus={order.paymentStatus}
              audience="student"
            />
          </div>
        </CardContent>
      </Card>

      {/* Order Summary Details */}
      <Card className="rounded-2xl border border-border shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-2 text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wider">
              {order.orderUid}
            </span>
            <span className="text-muted-foreground">
              {formatDate(order.createdAt)}
            </span>
          </div>

          <div className="space-y-2">
            {order.items.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm py-0.5"
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-foreground truncate font-medium">
                    {line.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    × {line.quantity}
                  </span>
                </div>
                <Price
                  amount={line.priceAtOrderTime * line.quantity}
                  className="font-semibold text-foreground flex-shrink-0"
                />
              </div>
            ))}
          </div>

          <div className="border-t border-border/80 pt-2.5 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Item Total</span>
              <Price amount={order.totalAmount} />
            </div>

            {order.walletAmountApplied > 0 && (
              <div className="flex justify-between text-success font-medium">
                <span>Wallet Paid</span>
                <span>−{formatINR(order.walletAmountApplied)}</span>
              </div>
            )}

            {order.gatewayAmount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Online (UPI/Card)</span>
                <Price amount={order.gatewayAmount} />
              </div>
            )}

            <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border/60">
              <span>Total Paid</span>
              <Price amount={order.totalAmount} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Navigation */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => navigate('/student')}
          className="flex-1 h-12 rounded-xl text-xs font-semibold gap-2"
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/student/orders')}
          className="flex-1 h-12 rounded-xl text-xs font-semibold gap-2"
        >
          <ReceiptText className="h-4 w-4" />
          <span>All Orders</span>
        </Button>
      </div>
    </div>
  );
};
