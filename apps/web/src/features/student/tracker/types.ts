export type TrackedStatus = 'placed' | 'queued' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type TrackedPayment = 'pending' | 'paid' | 'failed' | 'refunded_to_wallet';

export interface TrackedOrder {
  id: string;
  orderUid: string;
  tokenNo: string;
  canteenId: string;
  canteenName: string;
  counterLabel?: string;
  status: TrackedStatus;
  paymentStatus: TrackedPayment;
  items: { menuItemId: string; name: string; quantity: number; priceAtOrderTime: number }[];
  totalAmount: number;
  walletAmountApplied: number;
  gatewayAmount: number;
  estimatedPrepSeconds: number | null;
  targetPickupTime: string | null;
  paymentExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  readyAt?: string;
  completedAt?: string;
  cancelReason?: string;
  refundedAmount?: number;
}

export type LedgerType = 'checkout_hold' | 'checkout_capture' | 'hold_release' | 'refund_credit' | 'admin_adjustment' | 'expiry';
export interface Wallet { balance: number; updatedAt: string }
export interface LedgerEntry {
  id: number;
  entryType: LedgerType;
  amount: number; // signed in mocks: + credit, - debit
  orderUid?: string;
  canteenName?: string;
  reason: string;
  balanceAfter: number;
  createdAt: string;
}
export interface Page<T> { items: T[]; nextCursor: string | null }

export interface StatusChangedPayload { orderId: string; from: TrackedStatus; to: TrackedStatus; order: TrackedOrder }
export interface EtaPayload { orderId: string; estimatedPrepSeconds: number | null; targetPickupTime: string | null }
export interface WalkPayload { orderId: string; tokenNo: string; counterLabel?: string }
export interface CancelledPayload { orderId: string; reason?: string; refundedAmount?: number; cancelledBy: 'student' | 'staff' | 'system' }