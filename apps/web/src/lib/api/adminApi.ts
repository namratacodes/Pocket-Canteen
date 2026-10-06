import { api } from './client';
import type {
  AdminCanteen, AdminOverview, CreateCanteenInput, CreateStaffInput, CreateStaffResponse,
  SettlementEntry, SettlementReport, SettlementRow, StaffAccount,
} from '@/types/admin';

export const adminApi = {
  overview: () => api<AdminOverview>('/admin/overview'),
  canteens: () => api<AdminCanteen[]>('/admin/canteens'),
  canteen: (id: string) => api<AdminCanteen>(`/admin/canteens/${id}`),
  createCanteen: (input: CreateCanteenInput) =>
    api<AdminCanteen>('/admin/canteens', { method: 'POST', json: input }),
  updateCanteen: (id: string, input: Partial<CreateCanteenInput>) =>
    api<AdminCanteen>(`/admin/canteens/${id}`, { method: 'PATCH', json: input }),

  staff: (canteenId?: string) =>
    api<StaffAccount[]>(`/admin/staff${canteenId ? `?canteenId=${encodeURIComponent(canteenId)}` : ''}`),
  createStaff: (input: CreateStaffInput) =>
    api<CreateStaffResponse>('/admin/staff', { method: 'POST', json: input }),
  resetStaffPassword: (id: string) =>
    api<{ tempPassword: string }>(`/admin/staff/${id}/reset-password`, { method: 'POST' }),
  setStaffStatus: (id: string, status: 'active' | 'disabled') =>
    api<StaffAccount>(`/admin/staff/${id}`, { method: 'PATCH', json: { status } }),

  settlements: (period: string) =>
    api<SettlementReport>(`/admin/settlements?period=${encodeURIComponent(period)}`),
  settlementEntries: (id: string) => api<SettlementEntry[]>(`/admin/settlements/${id}/entries`),
  settle: (id: string) => api<SettlementRow>(`/admin/settlements/${id}/settle`, { method: 'POST' }),
};