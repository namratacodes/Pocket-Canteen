import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useSentinel } from '@/lib/hooks/useSentinel';
import { cn } from '@/lib/utils';
import { OrderCard } from './OrderCard';
import { useActiveOrders, useActiveOrdersLive, usePastOrders } from './useOrders';
import { useReorder } from './useReorder';

type Tab = 'active' | 'past';

export function OrderHistoryPage() {
  const [tab, setTab] = useState<Tab>('active');
  const active = useActiveOrders();
  const past = usePastOrders(tab === 'past');
  const { reorder, busyId } = useReorder();
  useActiveOrdersLive();

  const pastOrders = past.data?.pages.flatMap((p) => p.items) ?? [];
  const canLoadMore = !!past.hasNextPage && !past.isFetchingNextPage;
  const sentinel = useSentinel(() => { if (canLoadMore) void past.fetchNextPage(); }, tab === 'past' && !!past.hasNextPage);

  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
      className={cn('h-11 flex-1 rounded-lg text-sm font-semibold', tab === t ? 'bg-primary text-primary-foreground' : 'border border-border')}
    >
      {label}
    </button>
  );

  const loading = (tab === 'active' ? active.isLoading : past.isLoading);
  const failed = tab === 'active' ? active.isError : past.isError;

  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-24">
      <h1 className="text-xl font-bold">Your orders</h1>
      <div role="tablist" className="flex gap-2">
        {tabBtn('active', `Active (${active.data?.length ?? 0})`)}
        {tabBtn('past', 'Past')}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : failed ? (
        <div className="space-y-3 py-10 text-center">
          <p className="font-semibold">Could not load your orders</p>
          <button type="button" onClick={() => void (tab === 'active' ? active.refetch() : past.refetch())} className="h-12 rounded-lg bg-primary px-6 font-semibold text-primary-foreground">Retry</button>
        </div>
      ) : tab === 'active' ? (
        (active.data ?? []).length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <p>No active orders. Hungry?</p>
            <Link to="/student" className="inline-flex h-12 items-center rounded-lg bg-primary px-6 font-semibold text-primary-foreground">Browse canteens</Link>
          </div>
        ) : (
          <div className="space-y-3">{active.data!.map((o) => <OrderCard key={o.id} order={o} />)}</div>
        )
      ) : pastOrders.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No past orders yet</p>
      ) : (
        <div className="space-y-3">
          {pastOrders.map((o) => <OrderCard key={o.id} order={o} onReorder={reorder} reordering={busyId === o.id} />)}
          {past.hasNextPage && (
            <div ref={sentinel} className="py-3 text-center">
              <button type="button" onClick={() => void past.fetchNextPage()} disabled={past.isFetchingNextPage} className="h-11 rounded-lg border border-border px-5 text-sm">
                {past.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}