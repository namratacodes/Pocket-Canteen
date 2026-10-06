import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import { timeAgo } from '../shared/dates';
import type { StaffAccount } from '@/types/admin';
import { StatusPill } from '../shared/StatusPill';
import { CredentialRevealDialog, type RevealedCredentials } from './CredentialRevealDialog';

export interface StaffListProps {
  canteenId?: string;
  search?: string;
}

export const StaffList: React.FC<StaffListProps> = ({ canteenId, search = '' }) => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.admin.staffList(canteenId),
    queryFn: () => adminApi.staff(canteenId),
  });
  const [credentials, setCredentials] = useState<RevealedCredentials | null>(null);
  const [toggling, setToggling] = useState<StaffAccount | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (s) => !term || s.name.toLowerCase().includes(term) || s.email.toLowerCase().includes(term)
    );
  }, [query.data, search]);

  const resetPassword = async (s: StaffAccount) => {
    setBusyId(s.id);
    try {
      const { tempPassword } = await adminApi.resetStaffPassword(s.id);
      setCredentials({ name: s.name, email: s.email, tempPassword, kind: 'reset' });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reset the password. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmToggle = async () => {
    if (!toggling) return;
    const next = toggling.status === 'active' ? 'disabled' : 'active';
    setBusyId(toggling.id);
    try {
      await adminApi.setStaffStatus(toggling.id, next);
      qc.invalidateQueries({ queryKey: queryKeys.admin.staff });
      toast.success(next === 'disabled' ? `${toggling.name} can no longer sign in` : `${toggling.name} can sign in again`);
      setToggling(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update the account. Try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {query.isLoading && <SkeletonCard lines={5} />}
      {query.isError && <ErrorState title="Couldn't load staff accounts" error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Users}
          title={query.data.length === 0 ? 'No staff accounts yet' : 'No staff match'}
          description={
            query.data.length === 0
              ? 'Add a staff login so this canteen can run its kitchen board.'
              : 'Try a different search.'
          }
        />
      )}
      {query.isSuccess && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Canteen</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last login</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.email}</td>
                  <td className="px-4 py-3">{s.canteenName}</td>
                  <td className="px-4 py-3">
                    {s.status === 'active' ? (
                      <StatusPill tone="success">Active</StatusPill>
                    ) : (
                      <StatusPill tone="muted">Disabled</StatusPill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.lastLoginAt ? timeAgo(s.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={busyId === s.id} onClick={() => resetPassword(s)}>
                        Reset password
                      </Button>
                      <Button variant="ghost" size="sm" disabled={busyId === s.id} onClick={() => setToggling(s)}>
                        {s.status === 'active' ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <CredentialRevealDialog credentials={credentials} onDone={() => setCredentials(null)} />

      <ConfirmDialog
        open={!!toggling}
        onOpenChange={(open) => {
          if (!open) setToggling(null);
        }}
        title={toggling?.status === 'active' ? `Disable ${toggling?.name}?` : `Enable ${toggling?.name}?`}
        description={
          toggling?.status === 'active'
            ? 'They will be signed out and unable to sign in until you enable the account again.'
            : 'They will be able to sign in with their current password again.'
        }
        confirmText={toggling?.status === 'active' ? 'Disable account' : 'Enable account'}
        destructive={toggling?.status === 'active'}
        loading={busyId === toggling?.id}
        onConfirm={confirmToggle}
      />
    </>
  );
};