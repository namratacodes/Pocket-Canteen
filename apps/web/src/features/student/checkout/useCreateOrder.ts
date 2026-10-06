import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api/client';
import { qk } from '@/lib/api/queryKeys';
import { useAuth } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { openCheckout } from '@/lib/payments/razorpay';
import type {
  CreateOrderRequest,
  CreateOrderResponse,
} from '@/types';

export type CheckoutStep =
  | 'idle'
  | 'creating'
  | 'awaiting_payment'
  | 'verifying'
  | 'done';

export interface OrderErrorState {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export function useCreateOrder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuth((state) => state.user);
  const cartStore = useCartStore();
  const pickupCodeStore = usePickupCodeStore();

  const [step, setStep] = useState<CheckoutStep>('idle');
  const [orderError, setOrderError] = useState<OrderErrorState | null>(null);

  // Idempotency key per checkout attempt, reused on retries
  const idempotencyKeyRef = useRef<string>(
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `pc_idemp_${Date.now()}_${Math.random().toString(36).substring(2)}`
  );

  const resetIdempotencyKey = () => {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `pc_idemp_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  };

  const finish = (orderId: string, options?: { pending?: boolean }) => {
    setStep('done');
    cartStore.clear();
    queryClient.invalidateQueries({ queryKey: qk.wallet });
    queryClient.invalidateQueries({ queryKey: qk.ordersActive });

    const query = options?.pending ? '?fresh=1&pending=1' : '?fresh=1';
    navigate(`/student/orders/${orderId}${query}`);
  };

  const createOrder = async ({ useWallet }: { useWallet: boolean }) => {
    if (step !== 'idle') return; // Guard against double submission

    const { canteenId, lines } = cartStore;
    if (!canteenId || Object.keys(lines).length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setOrderError(null);
    setStep('creating');

    const requestPayload: CreateOrderRequest = {
      canteenId,
      items: Object.values(lines).map((l) => ({
        menuItemId: l.item.id,
        quantity: l.qty,
      })),
      useWallet,
      idempotencyKey: idempotencyKeyRef.current,
    };

    try {
      // 1. Post order to backend
      const res = await api<CreateOrderResponse>('/orders', {
        method: 'POST',
        json: requestPayload,
      });

      // 2. Immediately save raw pickup code locally (survives refreshes)
      pickupCodeStore.save(res.order.id, {
        code: res.pickupCode,
        tokenNo: res.order.tokenNo,
      });

      // 3. Check if payment gateway is required
      if (res.razorpay) {
        setStep('awaiting_payment');

        const result = await openCheckout({
          keyId: res.razorpay.keyId,
          orderId: res.razorpay.orderId,
          amount: res.razorpay.amount,
          currency: 'INR',
          name: res.order.canteenName,
          description: `Pocket Canteen · ${res.order.tokenNo}`,
          prefill: {
            name: user?.name,
            contact: user?.phone,
          },
          themeColor: '#F97316',
          onSuccess: async (paymentResponse) => {
            setStep('verifying');
            try {
              await api('/payments/verify', {
                method: 'POST',
                json: {
                  orderId: res.order.id,
                  ...paymentResponse,
                },
              });
            } catch {
              // Webhook will also reconcile on backend; continue to tracker
            }
            finish(res.order.id);
          },
          onDismiss: () => {
            // Dismissed modal leaves order in pending status
            finish(res.order.id, { pending: true });
          },
          onFailure: () => {
            toast.error('Payment failed. You can retry from the order page.');
            finish(res.order.id, { pending: true });
          },
        });

        if (result === 'dismissed') {
          finish(res.order.id, { pending: true });
        }
      } else {
        // Fully covered by wallet
        toast.success('Order placed successfully using wallet balance!');
        finish(res.order.id);
      }
    } catch (err: any) {
      setStep('idle');

      if (err instanceof ApiError) {
        setOrderError({
          code: err.code,
          message: err.message,
          details: err.details,
        });

        switch (err.code) {
          case 'ITEM_UNAVAILABLE':
            toast.error(err.message || 'An item in your cart is sold out.');
            break;
          case 'PRICE_CHANGED':
            toast.error('Item prices updated. Please review your cart.');
            queryClient.invalidateQueries({ queryKey: qk.menu(canteenId) });
            break;
          case 'CANTEEN_CLOSED':
            toast.error('Canteen has closed for orders.');
            break;
          case 'INSUFFICIENT_WALLET':
            toast.error('Wallet balance changed. Recomputing...');
            queryClient.invalidateQueries({ queryKey: qk.wallet });
            break;
          case 'RATE_LIMITED':
            toast.error('Slow down, try again in a few seconds.');
            break;
          case 'NETWORK':
            toast.error("Couldn't reach server. Check your connection.");
            break;
          default:
            toast.error(err.message || 'Failed to place order. Please try again.');
        }
      } else {
        setOrderError({
          code: 'NETWORK',
          message: "Couldn't reach server. Check your internet connection.",
        });
        toast.error("Couldn't reach server. Check your connection.");
      }
    }
  };

  return {
    step,
    isSubmitting: step === 'creating' || step === 'verifying',
    orderError,
    setOrderError,
    createOrder,
    resetIdempotencyKey,
  };
}
