import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/stores/authStore';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';
import type { AnalyticsRange, Kpis } from '@/types/admin';
import { CombosCard } from './cards/CombosCard';
import { EtaAccuracyCard } from './cards/EtaAccuracyCard';
import { KpiCard } from './cards/KpiCard';
import { MenuMatrixCard } from './cards/MenuMatrixCard';
import { PeakHoursCard } from './cards/PeakHoursCard';
import { PrepSheetCard } from './cards/PrepSheetCard';
import { TopDishesCard } from './cards/TopDishesCard';
import { useAnalytics } from './useAnalytics';

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

export interface AnalyticsDashboardProps {
  /** Admin passes a canteen. Staff omit it: the backend reads their canteen from the JWT. */
  canteenId?: string;
  canteenName?: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ canteenId, canteenName }) => {
  const [range, setRange] = useState<AnalyticsRange>('today');
  const userCanteenName = useAuth((s) => s.user?.canteenName);
  const params: AnalyticsParams = { canteenId, range };
  const kpis = useAnalytics<Kpis>('kpis', params);

  return (
    <div className="space-y-4">
      <div className="flex gap-1" role="group" aria-label="Time range">
        {RANGES.map((r) => (
          <Button
            key={r.value}
            type="button"
            size="sm"
            variant={range === r.value ? 'default' : 'outline'}
            aria-pressed={range === r.value}
            onClick={() => setRange(r.value)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <KpiCard query={kpis} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PeakHoursCard params={params} />
        <TopDishesCard params={params} />
        <PrepSheetCard params={params} canteenName={canteenName ?? userCanteenName ?? 'Canteen'} />
        <MenuMatrixCard params={params} />
        <CombosCard params={params} />
        <EtaAccuracyCard params={params} />
      </div>
    </div>
  );
};