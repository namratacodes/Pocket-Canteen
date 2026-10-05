import React from 'react';
import { ChefHat, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/EmptyState';

export const KitchenBoardPage: React.FC = () => {
  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-100">
            Live Kitchen Order Board
          </h2>
          <p className="text-xs text-slate-400">
            Incoming orders, drag-and-drop cooking workflow, and 4-digit pickup code verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning" className="text-xs font-mono">
            Phase 1 Ready
          </Badge>
        </div>
      </div>

      {/* Kanban 3-Column Preview Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {/* NEW Column */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-slate-200">
                New (0)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">FIFO</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              icon={ChefHat}
              title="No New Orders"
              description="New student orders will appear here automatically with audible notifications in Phase 2."
              className="border-slate-800 bg-transparent text-slate-400"
            />
          </div>
        </div>

        {/* PREPARING Column */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-slate-200">
                Preparing (0)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">In Progress</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              title="Kitchen Idle"
              description="Orders being cooked with live ETA countdowns will appear here."
              className="border-slate-800 bg-transparent text-slate-400"
            />
          </div>
        </div>

        {/* READY Column */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-sm tracking-wide uppercase text-slate-200">
                Ready for Pickup (0)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">Counter</span>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <EmptyState
              title="No Ready Orders"
              description="Orders waiting for 4-digit code verification at the counter will appear here."
              className="border-slate-800 bg-transparent text-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
