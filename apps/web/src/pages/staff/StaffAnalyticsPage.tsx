import React from 'react';
import { AnalyticsDashboard } from '@/features/analytics/AnalyticsDashboard';

export const StaffAnalyticsPage: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h2 className="text-xl font-bold tracking-tight text-slate-100">Analytics and prep sheet</h2>
      <p className="text-xs text-slate-400">
        Busy hours, best sellers, tomorrow's predicted prep and combo suggestions for your canteen.
      </p>
    </div>
    <AnalyticsDashboard />
  </div>
);
