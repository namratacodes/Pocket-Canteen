import React from 'react';
import { Utensils } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

export const MenuManagerPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          Menu & Item Availability Manager
        </h2>
        <p className="text-xs text-slate-400">
          Real-time item stock toggles (Sold Out / Available) and canteen open/close status
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8">
        <EmptyState
          icon={Utensils}
          title="Menu Manager Launches in Phase 5"
          description="Staff will be able to toggle item stock status in real-time, instantly reflecting on student menus via WebSockets."
          className="border-slate-800 bg-transparent text-slate-400"
        />
      </div>
    </div>
  );
};
