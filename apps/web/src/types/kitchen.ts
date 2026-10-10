export type OrderStatus = 'placed' | 'queued' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type KitchenColumn = 'new' | 'preparing' | 'ready';

export interface KitchenOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  isVeg?: boolean;
  station?: string;
}

export interface KitchenOrder {
  id: string;
  orderUid: string;
  tokenNo: string;
  status: OrderStatus;
  paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded_to_wallet';
  studentName: string;
  items: KitchenOrderItem[];
  totalAmount: number;
  estimatedPrepSeconds: number | null;
  createdAt: string;
  preparingAt?: string;
  readyAt?: string;
  updatedAt: string;
  verifyAttemptsLeft: number;
  isLocked: boolean;
  note?: string;
}

export interface KitchenSummary {
  ordersToday: number;
  avgPrepMins: number;
  isRush: boolean;
  isOpen?: boolean; // ask backend to add; defaults to open when missing
}

export interface StaffMenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  isVeg: boolean;
  updatedBy?: string;
  updatedAt: string;
}