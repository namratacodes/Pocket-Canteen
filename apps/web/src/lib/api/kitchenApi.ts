import { api } from '@/features/staff/deps';
import type { KitchenOrder, KitchenSummary, StaffMenuItem } from '@/types/kitchen';

export const kitchenApi = {
  orders: () => api<KitchenOrder[]>('/kitchen/orders'),
  summary: () => api<KitchenSummary>('/kitchen/summary'),
  moveOrder: (id: string, to: 'preparing' | 'ready') =>
    api<KitchenOrder>(`/orders/${id}/status`, { method: 'PATCH', json: { to } }),
  verifyPickup: (id: string, code: string) =>
    api<{ order: KitchenOrder }>(`/orders/${id}/verify-pickup`, { method: 'POST', json: { code } }),
  overridePickup: (id: string, managerPin: string) =>
    api<{ order: KitchenOrder }>(`/orders/${id}/override-pickup`, { method: 'POST', json: { managerPin } }),
  cancelOrder: (id: string, reason: string) =>
    api<{ order: KitchenOrder; refundedAmount: number }>(`/orders/${id}/cancel`, { method: 'POST', json: { reason } }),
  menu: () => api<StaffMenuItem[]>('/kitchen/menu'),
  setAvailability: (id: string, isAvailable: boolean) =>
    api<StaffMenuItem>(`/menu-items/${id}`, { method: 'PATCH', json: { isAvailable } }),
  setCanteenOpen: (isOpen: boolean) =>
    api<{ isOpen: boolean }>('/canteens/me', { method: 'PATCH', json: { isOpen } }),
};