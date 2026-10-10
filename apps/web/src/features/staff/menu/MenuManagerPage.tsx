import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/stores/authStore';
import type { StaffMenuItem } from '@/types/kitchen';
import { AvailabilityRow } from './AvailabilityRow';
import { CanteenOpenSwitch } from './CanteenOpenSwitch';
import { useMenuLive, useSetAvailability, useStaffMenu } from './useMenu';

type Filter = 'all' | 'available' | 'soldout';

export function MenuManagerPage() {
  const user = useAuth((s) => s.user);
  const { data, isLoading, isError, refetch } = useStaffMenu();
  const set = useSetAvailability();
  useMenuLive();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = (data ?? []).filter(
      (i) => (!term || i.name.toLowerCase().includes(term)) && (filter === 'all' || (filter === 'available') === i.isAvailable),
    );
    const m = new Map<string, StaffMenuItem[]>();
    for (const i of list) m.set(i.category, [...(m.get(i.category) ?? []), i]);
    return [...m.entries()];
  }, [data, q, filter]);

  const toggle = (id: string, isAvailable: boolean) => set.mutate({ id, isAvailable });
  const select = (id: string, on: boolean) =>
    setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const bulk = (isAvailable: boolean) => { selected.forEach((id) => set.mutate({ id, isAvailable })); setSelected(new Set()); };

  const tab = (f: Filter, label: string) => (
    <button type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
      className={`h-11 rounded-lg border px-4 text-sm font-semibold ${filter === f ? 'border-primary bg-primary/10' : 'border-border'}`}>{label}</button>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Menu · {user?.canteenName ?? 'Canteen'}</h1>
        <CanteenOpenSwitch canteenName={user?.canteenName ?? 'the canteen'} />
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search items" aria-label="Search items"
            className="h-11 w-full rounded-lg border border-border bg-card pl-9 pr-3" />
        </div>
        {tab('all', 'All')}{tab('available', 'Available')}{tab('soldout', 'Sold out')}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/50 bg-primary/5 p-2">
          <span className="text-sm font-semibold">{selected.size} selected</span>
          <button type="button" onClick={() => bulk(false)} className="h-11 rounded-lg bg-red-600 px-4 text-sm font-bold text-white">Mark sold out</button>
          <button type="button" onClick={() => bulk(true)} className="h-11 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white">Mark available</button>
          <button type="button" onClick={() => setSelected(new Set())} className="h-11 rounded-lg border border-border px-4 text-sm">Clear</button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : isError ? (
        <div className="space-y-3 py-10 text-center">
          <p className="font-semibold">Could not load the menu</p>
          <button type="button" onClick={() => void refetch()} className="h-12 rounded-lg bg-primary px-6 font-bold text-primary-foreground">Retry</button>
        </div>
      ) : groups.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">No items match</p>
      ) : (
        groups.map(([category, items]) => (
          <section key={category}>
            <h2 className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">{category}</h2>
            <ul className="rounded-xl border border-border bg-card">
              {items.map((i) => (
                <AvailabilityRow key={i.id} item={i} selected={selected.has(i.id)} onSelect={select} onToggle={toggle} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}