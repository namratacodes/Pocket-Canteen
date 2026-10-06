import React, { useMemo } from 'react';
import {
  CartesianGrid, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import type { MatrixPoint } from '@/types/admin';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';
import { AnalyticsCard } from './AnalyticsCard';
import { TooltipBox } from './TooltipBox';
import { QUADRANTS, QUADRANT_ORDER, chartColors } from '../chartColors';
import { median } from '../format';
import { useAnalytics } from '../useAnalytics';

const Matrix: React.FC<{ points: MatrixPoint[] }> = ({ points }) => {
  const medX = useMemo(() => median(points.map((p) => p.volume)), [points]);
  const medY = useMemo(() => median(points.map((p) => p.margin)), [points]);
  return (
    <>
      <div className="h-72" role="img" aria-label="Scatter chart of menu items by sales volume and margin, split into four quadrants">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 20, left: 0 }}>
            <CartesianGrid stroke={chartColors.grid} />
            <XAxis
              type="number"
              dataKey="volume"
              name="Volume"
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              label={{ value: 'Sales volume', position: 'insideBottom', offset: -10, fill: chartColors.axis, fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="margin"
              name="Margin"
              tick={{ fill: chartColors.axis, fontSize: 11 }}
              label={{ value: 'Margin', angle: -90, position: 'insideLeft', fill: chartColors.axis, fontSize: 11 }}
            />
            <ZAxis range={[70, 70]} />
            <ReferenceLine x={medX} stroke={chartColors.axis} strokeDasharray="4 4" />
            <ReferenceLine y={medY} stroke={chartColors.axis} strokeDasharray="4 4" />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={
                <TooltipBox
                  render={(p: MatrixPoint) => (
                    <>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-muted-foreground">{QUADRANTS[p.quadrant].label}</p>
                      <p className="mt-1">{p.suggestion}</p>
                    </>
                  )}
                />
              }
            />
            {QUADRANT_ORDER.map((q) => (
              <Scatter
                key={q}
                name={QUADRANTS[q].label}
                data={points.filter((p) => p.quadrant === q)}
                fill={QUADRANTS[q].color}
                shape={QUADRANTS[q].shape}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid gap-1.5 text-xs sm:grid-cols-2">
        {QUADRANT_ORDER.map((q) => (
          <li key={q} className="flex items-start gap-2">
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: QUADRANTS[q].color }} aria-hidden />
            <span>
              <span className="font-semibold">{QUADRANTS[q].label}.</span>{' '}
              <span className="text-muted-foreground">{QUADRANTS[q].action}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
};

export const MenuMatrixCard: React.FC<{ params: AnalyticsParams }> = ({ params }) => {
  const query = useAnalytics<MatrixPoint[]>('menu-matrix', params);
  return (
    <AnalyticsCard
      title="Menu engineering matrix"
      subtitle="Dashed lines mark the median volume and margin"
      query={query}
      errorTitle="Menu matrix unavailable. ML service offline"
      isEmpty={(d) => d.length === 0}
    >
      {(points) => <Matrix points={points} />}
    </AnalyticsCard>
  );
};