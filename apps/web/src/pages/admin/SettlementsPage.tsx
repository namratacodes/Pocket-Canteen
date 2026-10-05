import React from 'react';
import { Coins, Download, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';

export const SettlementsPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Monthly Canteen Financial Settlements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualizes Member 1's financial netting algorithm and conservation-of-funds validation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </Button>
          <Button size="sm" className="gap-2 font-semibold">
            <Play className="h-4 w-4" />
            <span>Run Netting Query</span>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <EmptyState
          icon={Coins}
          title="Settlements Engine Launches in Phase 5"
          description="Netting calculations: credit issued vs redeemed per canteen, zero-sum conservation proof, and direct debtor-to-creditor transfer schedule."
        />
      </div>
    </div>
  );
};
