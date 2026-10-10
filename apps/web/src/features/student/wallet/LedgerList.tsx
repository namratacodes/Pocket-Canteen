import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatINR, formatTime } from '@/lib/format';
import { useSentinel } from '@/lib/hooks/useSentinel';
import { cn } from '@/lib/utils';
import { groupByDay, ledgerMeta, toneClass } from './ledgerMeta';
import { useLedger, type LedgerFilter } from './useWallet';

const FILTERS: { id: LedgerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'credit', label: 'Credits' },
  { id: 'debit', label: 'Debits' },
];

export function LedgerList() {
  const [filter, setFilter] = useState<LedgerFilter>('all');
  const q = useLedger(filter);
  const entries = q.data?.pages.flatMap((p) => p.items) ?? [];
  const sentinel = useSentinel(() => { if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage(); }, !!q.hasNextPage);

  return (
    <section className="space-y-3">
      <div role="tablist" className="flex gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}
            className={cn('h-10 rounded-lg px-4 text-sm font-semibold', filter === f.id ? 'bg-primary text-primary-foreground' : 'border border-border')}>
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : q.isError ? (
        <div className="space-y-2 py-6 text-center">
          <p className="font-semibold">Could not load transactions</p>
          <button type="button" onClick={() => void q.refetch()} className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground">Retry</button>
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">No transactions yet</p>
      ) : (
        <>
          {groupByDay(entries).map((g) => (
            <div key={g.label}>
              <h2 className="py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{g.label}</h2>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {g.entries.map((e) => {
                  const m = ledgerMeta(e);
                  const Icon = m.icon;
                  return (
                    <li key={e.id} className="flex items-center gap-3 px-3 py-3">
                      <Icon className={cn('h-5 w-5 shrink-0', toneClass[m.tone])} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{m.label}</p>
                        {e.canteenName && <p className="truncate text-xs text-muted-foreground">{e.canteenName}</p>}
                      </div>
                      <div className="text-right">
                        <p className={cn('text-sm font-semibold tabular-nums', toneClass[m.tone])}>{m.sign}{formatINR(Math.abs(e.amount))}</p>
                        <p className="text-xs text-muted-foreground">bal {formatINR(e.balanceAfter)} · {formatTime(e.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          {q.hasNextPage && (
            <div ref={sentinel} className="py-2 text-center">
              <button type="button" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage} className="h-10 rounded-lg border border-border px-4 text-sm">
                {q.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}