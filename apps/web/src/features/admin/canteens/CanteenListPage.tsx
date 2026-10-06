import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { Price } from '@/components/common/Price';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import { formatDate } from '../shared/dates';
import { KycBadge, OpenBadge } from '../shared/StatusPill';
import { selectClass } from '../shared/styles';

type OpenFilter = 'all' | 'open' | 'closed';

export const CanteenListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OpenFilter>('all');

  const query = useQuery({ queryKey: queryKeys.admin.canteens, queryFn: () => adminApi.canteens() });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((c) => {
      if (filter === 'open' && !c.isOpen) return false;
      if (filter === 'closed' && c.isOpen) return false;
      return !term || c.name.toLowerCase().includes(term) || c.location.toLowerCase().includes(term);
    });
  }, [query.data, search, filter]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Canteens</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every canteen on the platform and its payment status.</p>
        </div>
        <Button onClick={() => navigate('/admin/canteens/new')} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden /> Onboard canteen
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            aria-label="Search canteens"
            placeholder="Search by name or location"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by open status"
          className={`${selectClass} !w-44`}
          value={filter}
          onChange={(e) => setFilter(e.target.value as OpenFilter)}
        >
          <option value="all">All canteens</option>
          <option value="open">Open now</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {query.isLoading && <SkeletonCard lines={6} />}
      {query.isError && <ErrorState title="Couldn't load canteens" error={query.error} onRetry={() => query.refetch()} />}
      {query.isSuccess && rows.length === 0 && (
        <EmptyState
          icon={Store}
          title={query.data.length === 0 ? 'No canteens yet' : 'No canteens match'}
          description={
            query.data.length === 0
              ? 'Onboard the first canteen to start taking orders.'
              : 'Try a different search or filter.'
          }
        />
      )}
      {query.isSuccess && rows.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">KYC</th>
                <th className="px-4 py-3 text-right font-medium">Staff</th>
                <th className="px-4 py-3 text-right font-medium">Orders today</th>
                <th className="px-4 py-3 text-right font-medium">GMV today</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/canteens/${c.id}`)}
                      className="rounded text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {c.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.location}</td>
                  <td className="px-4 py-3"><OpenBadge isOpen={c.isOpen} /></td>
                  <td className="px-4 py-3"><KycBadge status={c.payment.kycStatus} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.staffCount}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.stats.ordersToday.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-right"><Price amount={c.stats.gmvToday} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};