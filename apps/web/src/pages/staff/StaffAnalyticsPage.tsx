import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export const StaffAnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          Kitchen Analytics & Predictive Prep Sheet
        </h2>
        <p className="text-xs text-slate-400">
          Peak hour order volume, top selling dishes, and Member 3's ML demand forecast
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <EmptyState
          icon={BarChart3}
          title="Staff Analytics Launches in Phase 5"
          description="Visualizes ML-driven demand forecasts, hourly rush charts, tomorrow's prep sheet, and combo sales."
          className="border-slate-800 bg-transparent text-slate-400"
        />
      </div>
    </div>
  );
};
