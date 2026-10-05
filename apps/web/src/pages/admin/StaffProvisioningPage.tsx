import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/EmptyState';

export const StaffProvisioningPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Staff Account Provisioning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create kitchen staff logins, assign canteens, and generate one-time credentials
          </p>
        </div>

        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span>Provision Staff</span>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <EmptyState
          icon={Users}
          title="Staff Provisioning & Credential Reveal Launches in Phase 5"
          description="Provision kitchen staff accounts scoped to specific canteens with one-time visible temporary passwords and reset capabilities."
        />
      </div>
    </div>
  );
};
