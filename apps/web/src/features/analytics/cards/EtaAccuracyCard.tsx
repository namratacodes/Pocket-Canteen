import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { EtaAccuracy } from '@/types/admin';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';
import { StatusPill } from '@/features/admin/shared/StatusPill';
import { AnalyticsCard } from './AnalyticsCard';
import { TooltipBox } from './TooltipBox';
import { chartColors } from '../chartColors';
import { useAnalytics } from '../useAnalytics';

export const EtaAccuracyCard: React.FC<{ params: AnalyticsParams }> = ({ params }) => {
  const query = useAnalytics<EtaAccuracy>('eta-accuracy', params);
  return (
    <AnalyticsCard
      title="ETA accuracy"
      subtitle="Predicted vs actual prep time, in minutes"
      query={query}
      errorTitle="ETA accuracy unavailable"
      isEmpty={(d) => d.points.length === 0}
      action={
        query.data && (
          <StatusPill tone={query.data.mae < 2.5 ? 'success' : 'warning'}>
            MAE {query.data.mae.toFixed(1)} min
          </StatusPill>
        )
      }
    >
      {(d) => (
        <div className="h-64" role="img" aria-label="Line chart comparing predicted and actual average prep time per day">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={d.points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke={chartColors.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={(v: string) => format(parseISO(v), 'd MMM')}
                tick={{ fill: chartColors.axis, fontSize: 11 }}
              />
              <YAxis tick={{ fill: chartColors.axis, fontSize: 11 }} />
              <Tooltip
                content={
                  <TooltipBox
                    render={(p: EtaAccuracy['points'][number]) => (
                      <>
                        <p className="font-semibold">{format(parseISO(p.date), 'EEE d MMM')}</p>
                        <p>Predicted {p.predictedAvg.toFixed(1)} min</p>
                        <p>Actual {p.actualAvg.toFixed(1)} min</p>
                      </>
                    )}
                  />
                }
              />
              <Legend />
              <Line type="monotone" dataKey="predictedAvg" name="Predicted" stroke={chartColors.info} strokeDasharray="5 4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="actualAvg" name="Actual" stroke={chartColors.brand} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </AnalyticsCard>
  );
};