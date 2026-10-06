import React from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Flame } from 'lucide-react';
import { formatINR } from '@/lib/format';
import type { PeakHour } from '@/types/admin';
import { AnalyticsCard } from './AnalyticsCard';
import { TooltipBox } from './TooltipBox';
import { chartColors } from '../chartColors';
import { formatHour, percentile } from '../format';
import { useAnalytics } from '../useAnalytics';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';

export const PeakHoursCard: React.FC<{ params: AnalyticsParams }> = ({ params }) => {
  const query = useAnalytics<PeakHour[]>('peak-hours', params);
  return (
    <AnalyticsCard
      title="Peak hours"
      subtitle="Orders by hour of the day"
      query={query}
      errorTitle="Peak hours unavailable"
      isEmpty={(d) => d.length === 0}
    >
      {(rows) => {
        const data = [...rows].sort((a, b) => a.hour - b.hour);
        const threshold = percentile(data.map((r) => r.orders), 0.75);
        return (
          <>
            <div className="h-64" role="img" aria-label="Bar chart of orders per hour. Rush hours are highlighted.">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid vertical={false} stroke={chartColors.grid} />
                  <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fill: chartColors.axis, fontSize: 11 }} interval={1} />
                  <YAxis allowDecimals={false} tick={{ fill: chartColors.axis, fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={
                      <TooltipBox
                        render={(r: PeakHour) => (
                          <>
                            <p className="font-semibold">{formatHour(r.hour)}</p>
                            <p>{r.orders} orders</p>
                            <p className="text-muted-foreground">{formatINR(r.revenue)}</p>
                            {r.orders >= threshold && <p className="font-medium text-amber-700">Rush hour</p>}
                          </>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                    {data.map((r) => (
                      <Cell key={r.hour} fill={r.orders >= threshold ? chartColors.brand : chartColors.neutral} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-brand" aria-hidden /> Orange bars are rush hours (the busiest quarter of the day).
            </p>
          </>
        );
      }}
    </AnalyticsCard>
  );
};