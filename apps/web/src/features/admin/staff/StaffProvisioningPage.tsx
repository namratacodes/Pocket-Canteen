import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import type { CreateStaffResponse } from '@/types/admin';
import { selectClass } from '../shared/styles';
import { AddStaffDialog } from './AddStaffDialog';
import { CredentialRevealDialog, type RevealedCredentials } from './CredentialRevealDialog';
import { StaffList } from './StaffList';

export const StaffProvisioningPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const canteenId = params.get('canteenId') ?? '';
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(params.get('new') === '1');
  const [credentials, setCredentials] = useState<RevealedCredentials | null>(null);

  const canteens = useQuery({ queryKey: queryKeys.admin.canteens, queryFn: () => adminApi.canteens() });

  // Deep link from the onboarding wizard: /admin/staff?canteenId=...&new=1
  useEffect(() => {
    if (params.get('new') === '1') {
      setAddOpen(true);
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, setParams]);

  const setCanteenFilter = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('canteenId', id);
    else next.delete('canteenId');
    setParams(next, { replace: true });
  };

  const onCreated = (res: CreateStaffResponse) =>
    setCredentials({ name: res.staff.name, email: res.staff.email, tempPassword: res.tempPassword, kind: 'created' });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage the logins canteen staff use on the kitchen board.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden /> Add staff
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by canteen"
          className={`${selectClass} !w-56`}
          value={canteenId}
          onChange={(e) => setCanteenFilter(e.target.value)}
        >
          <option value="">All canteens</option>
          {(canteens.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Search staff"
            placeholder="Search by name or email"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <StaffList canteenId={canteenId || undefined} search={search} />

      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        canteens={canteens.data ?? []}
        defaultCanteenId={canteenId || undefined}
        onCreated={onCreated}
      />
      <CredentialRevealDialog credentials={credentials} onDone={() => setCredentials(null)} />
    </div>
  );
};