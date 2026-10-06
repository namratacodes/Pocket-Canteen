import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/format';
import type { TopDish } from '@/types/admin';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';
import { AnalyticsCard } from './AnalyticsCard';
import { TooltipBox } from './TooltipBox';
import { chartColors } from '../chartColors';
import { compactINR } from '../format';
import { useAnalytics } from '../useAnalytics';

type Metric = 'qty' | 'revenue';

export const TopDishesCard: React.FC<{ params: AnalyticsParams }> = ({ params }) => {
  const query = useAnalytics<TopDish[]>('top-dishes', params);
  const [metric, setMetric] = useState<Metric>('qty');

  const toggle = (
    <div className="flex gap-1" role="group" aria-label="Rank dishes by">
      {(['qty', 'revenue'] as Metric[]).map((m) => (
        <Button
          key={m}
          type="button"
          size="sm"
          variant={metric === m ? 'default' : 'outline'}
          aria-pressed={metric === m}
          onClick={() => setMetric(m)}
        >
          {m === 'qty' ? 'Quantity' : 'Revenue'}
        </Button>
      ))}
    </div>
  );

  return (
    <AnalyticsCard
      title="Top dishes"
      subtitle="Top 10 for this period"
      query={query}
      errorTitle="Top dishes unavailable"
      isEmpty={(d) => d.length === 0}
      action={toggle}
    >
      {(rows) => {
        const data = [...rows].sort((a, b) => b[metric] - a[metric]).slice(0, 10);
        return (
          <div className="h-64" role="img" aria-label={`Horizontal bar chart of top dishes by ${metric === 'qty' ? 'quantity sold' : 'revenue'}`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid horizontal={false} stroke={chartColors.grid} />
                <XAxis
                  type="number"
                  tick={{ fill: chartColors.axis, fontSize: 11 }}
                  tickFormatter={(v: number) => (metric === 'revenue' ? compactINR(v) : String(v))}
                />
                <YAxis type="category" dataKey="name" width={112} interval={0} tick={{ fill: chartColors.axis, fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  content={
                    <TooltipBox
                      render={(r: TopDish) => (
                        <>
                          <p className="font-semibold">{r.name}</p>
                          <p>{r.qty} sold</p>
                          <p className="text-muted-foreground">{formatINR(r.revenue)}</p>
                        </>
                      )}
                    />
                  }
                />
                <Bar dataKey={metric} fill={chartColors.brand} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      }}
    </AnalyticsCard>
  );
};