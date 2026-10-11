import type { OrderStatus, PaymentStatus } from '@prisma/client';

/** All money in DTOs is integer paise, field names end in 'Paise'. All timestamps are ISO-8601 UTC strings. */

export interface OrderLineDTO {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPricePaise: number;
}

export interface KitchenOrderDTO {
  id: string;
  orderUid: string;
  tokenNo: string;
  status: OrderStatus;
  items: OrderLineDTO[];
  totalPaise: number;
  placedAt: string | null;
  predictedReadyAt: string | null;
  estimatedPrepSeconds: number | null;
}

export interface StudentOrderDTO {
  id: string;
  orderUid: string;
  tokenNo: string;
  canteenId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderLineDTO[];
  totalPaise: number;
  walletAppliedPaise: number;
  gatewayPaise: number;
  estimatedPrepSeconds: number | null;
  predictedReadyAt: string | null;
  etaSource: 'ml' | 'fallback' | null;
  pickupCode: string | null; // only while status is placed | preparing | ready
  createdAt: string;
  placedAt: string | null;
  readyAt: string | null;
  expiresAt: string | null;
}

export interface PaymentInitDTO {
  gatewayOrderId: string;
  keyId: string;
  amountPaise: number;
  currency: 'INR';
}

export interface Paginated<T> {
  data: T[];
  nextCursor: string | null;
}
