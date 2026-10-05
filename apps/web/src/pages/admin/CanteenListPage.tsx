import React from 'react';
import { Store, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';

export const CanteenListPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Canteen Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Onboard new campus canteens, configure FSSAI compliance, and manage payment accounts
          </p>
        </div>

        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>Onboard Canteen</span>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <EmptyState
          icon={Store}
          title="Canteen Management & Onboarding Wizard Launches in Phase 5"
          description="Admins will be able to onboard canteens with multi-step FSSAI license validation, operating hours, and Razorpay linked account setup."
        />
      </div>
    </div>
  );
};
