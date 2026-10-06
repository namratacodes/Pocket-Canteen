import React from 'react';
import type { ComboRule } from '@/types/admin';
import type { AnalyticsParams } from '@/lib/api/analyticsApi';
import { AnalyticsCard } from './AnalyticsCard';
import { pct } from '../format';
import { useAnalytics } from '../useAnalytics';

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>
);

export const CombosCard: React.FC<{ params: AnalyticsParams }> = ({ params }) => {
  const query = useAnalytics<ComboRule[]>('combos', params);
  return (
    <AnalyticsCard
      title="Frequent combos"
      subtitle="Items students often order together"
      query={query}
      errorTitle="Combos unavailable"
      isEmpty={(d) => d.length === 0}
    >
      {(rules) => (
        <ul className="divide-y divide-border">
          {[...rules].sort((a, b) => b.confidence - a.confidence).map((r) => (
            <li key={r.items.join('+')} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span className="font-medium">{r.items.join(' + ')}</span>
              <span className="flex gap-1.5">
                <Chip>Confidence {pct(r.confidence)}</Chip>
                <Chip>Lift {r.lift.toFixed(1)}x</Chip>
                <Chip>Support {pct(r.support)}</Chip>
              </span>
            </li>
          ))}
        </ul>
      )}
    </AnalyticsCard>
  );
};