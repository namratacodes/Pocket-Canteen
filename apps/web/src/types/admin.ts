// Phase 5 data contract (admin portal + analytics). Kept separate from types/index.ts
// so this phase never conflicts with other phases' type edits.

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export interface DayHours { open: string; close: string; closed: boolean }

export interface AdminCanteen {
  id: string;
  name: string;
  location: string;
  isOpen: boolean;
  fssaiLicenseNo: string;
  operatingHours: Record<Weekday, DayHours>;
  imageUrl?: string;
  payment: {
    razorpayAccountRef: string;
    bankAccountLast4: string;
    kycStatus: 'pending' | 'verified' | 'rejected';
  };
  stats: { ordersToday: number; gmvToday: number; activeOrders: number; staffCount: number };
  createdAt: string;
}
export type CreateCanteenInput = Omit<AdminCanteen, 'id' | 'stats' | 'createdAt' | 'isOpen'>;

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  canteenId: string;
  canteenName: string;
  status: 'active' | 'disabled';
  createdAt: string;
  lastLoginAt?: string;
}
export interface CreateStaffInput { name: string; email: string; phone: string; canteenId: string }
export interface CreateStaffResponse { staff: StaffAccount; tempPassword: string } // shown ONCE

export interface SettlementRow {
  id: string;
  canteenId: string;
  canteenName: string;
  creditIssued: number;
  creditRedeemed: number;
  netPayable: number; // Δ = redeemed - issued
  status: 'pending' | 'settled';
  settledAt?: string;
  recordedBy?: string;
}
export interface SettlementTransfer { from: string; to: string; amount: number }
export interface SettlementReport {
  period: string; // "2026-09"
  rows: SettlementRow[];
  floatingCredit: number;
  balanced?: boolean; // backend's own verdict, if provided
  transfers?: SettlementTransfer[];
}
export interface SettlementEntry {
  orderUid: string;
  type: 'issued' | 'redeemed';
  amount: number;
  date: string;
  studentMasked: string;
}
export interface AdminOverview {
  activeCanteens: number;
  ordersToday: number;
  gmvToday: number;
  floatingCredit: number;
  pendingSettlements: number;
  alerts: { id: string; level: 'warn' | 'error'; message: string; at: string }[];
}

// Analytics (Member 3 via backend)
export interface PeakHour { hour: number; orders: number; revenue: number }
export interface TopDish { menuItemId: string; name: string; qty: number; revenue: number }
export interface ForecastRow { menuItemId: string; name: string; predicted: number; low: number; high: number }
export type Quadrant = 'star' | 'plowhorse' | 'puzzle' | 'dog';
export interface MatrixPoint { menuItemId: string; name: string; volume: number; margin: number; quadrant: Quadrant; suggestion: string }
export interface ComboRule { items: string[]; support: number; confidence: number; lift: number } // support/confidence as 0-1
export interface EtaAccuracy { points: { date: string; predictedAvg: number; actualAvg: number }[]; mae: number }
export interface Kpis { orders: number; revenue: number; avgPrepMins: number; cancelRate: number } // cancelRate in percent
export type AnalyticsRange = 'today' | '7d' | '30d';