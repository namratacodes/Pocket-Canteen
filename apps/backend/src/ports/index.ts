import type { OrderStatus } from '@prisma/client';
import type { TxContext } from '../lib/tx';
import type { PaymentInitDTO } from '../types/dto';

/** Implemented by Phase 3 (wallet). All amounts are integer paise. Every method is idempotent per (orderId, entry type). */
export interface LedgerPort {
  getBalancePaise(userId: string): Promise<number>;
  /** Writes checkout_hold (negative). Locks the wallet row. Throws INSUFFICIENT_BALANCE. No-op if amountPaise = 0. */
  holdForCheckout(ctx: TxContext, p: { userId: string; orderId: string; amountPaise: number }): Promise<void>;
  /** Unpaid order died. Writes hold_release (+) if a checkout_hold exists and no release yet. Does NOT touch orders.payment_status. */
  releaseHold(ctx: TxContext, orderId: string): Promise<{ released: boolean; releasedPaise: number }>;
  /** Paid order cancelled. Writes refund_restore (+walletPart) and refund_credit (+gatewayPart, funded by order.canteenId). Sets orders.payment_status='refunded_to_wallet'. */
  refundCancelledOrder(ctx: TxContext, orderId: string): Promise<{ refundedPaise: number }>;
  /** Gateway captured money for an order that is already cancelled. Writes refund_credit (+gatewayAmount, funded by order.canteenId). Sets orders.payment_status='refunded_to_wallet'. */
  creditLatePayment(ctx: TxContext, orderId: string): Promise<{ creditedPaise: number }>;
}

/** Implemented by Phase 4 (orders). Both methods lock the order row themselves and are idempotent. */
export interface OrdersPort {
  /** pending_payment -> placed. Sets payment_status='paid', payment_ref, placed_at, predicted_ready_at, emits order:new. If already placed or later: changed=false. */
  confirmPayment(ctx: TxContext, p: { orderId: string; paymentRef: string | null }): Promise<{ changed: boolean; status: OrderStatus }>;
  /** pending_payment -> cancelled. Sets payment_status='failed', releases wallet hold via LedgerPort. If not pending_payment: changed=false. */
  cancelUnpaid(ctx: TxContext, p: { orderId: string; reason: string }): Promise<{ changed: boolean; status: OrderStatus }>;
}

/** Implemented by Phase 5 (payments). Idempotent: if a live 'created' attempt exists for the order, return it again. */
export interface PaymentsPort {
  initiate(orderId: string): Promise<PaymentInitDTO>;
}

/** Implemented by Phase 6 (platform). NEVER throws and never takes longer than about ML_TIMEOUT_MS + 20ms. */
export interface EtaPort {
  estimate(p: {
    canteenId: string;
    items: { menuItemId: string; quantity: number }[];
  }): Promise<{ seconds: number; source: 'ml' | 'fallback'; modelVersion?: string }>;
}

export interface Ports {
  ledger: LedgerPort;
  orders: OrdersPort;
  payments: PaymentsPort;
  eta: EtaPort;
}
