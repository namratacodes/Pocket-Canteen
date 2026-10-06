import { api } from './client';
import type { AnalyticsRange } from '@/types/admin';

export type AnalyticsName =
  | 'kpis' | 'peak-hours' | 'top-dishes' | 'forecast' | 'menu-matrix' | 'combos' | 'eta-accuracy';

export interface AnalyticsParams {
  canteenId?: string; // admin only; staff calls get the canteen from the JWT
  range?: AnalyticsRange;
  date?: string; // forecast date, yyyy-MM-dd
}

function toQuery(p: AnalyticsParams): string {
  const s = new URLSearchParams();
  (Object.entries(p) as [string, string | undefined][]).forEach(([k, v]) => {
    if (v) s.set(k, v);
  });
  const q = s.toString();
  return q ? `?${q}` : '';
}

export const analyticsApi = {
  get: <T>(name: AnalyticsName, params: AnalyticsParams = {}) =>
    api<T>(`/analytics/${name}${toQuery(params)}`),
};