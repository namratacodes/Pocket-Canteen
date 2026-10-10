import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { KitchenColumn } from '@/types/kitchen';
import { canMove } from './transitions';

const META: Record<KitchenColumn, { title: string; top: string; empty: string }> = {
  new: { title: 'NEW', top: 'border-t-sky-500', empty: 'No orders' },
  preparing: { title: 'PREPARING', top: 'border-t-amber-500', empty: 'Nothing cooking' },
  ready: { title: 'READY', top: 'border-t-emerald-500', empty: 'No pickups waiting' },
};

export function KanbanColumn({ column, count, children }: { column: KitchenColumn; count: number; children: ReactNode }) {
  const { setNodeRef, isOver, active } = useDroppable({ id: column });
  const from = active?.data.current?.column as KitchenColumn | undefined;
  const hovering = isOver && !!from && from !== column;
  const allowed = hovering && canMove(from!, column);
  const blocked = hovering && !allowed;
  const m = META[column];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${m.title} orders`}
      className={cn(
        'relative flex min-h-0 flex-col rounded-xl border-2 border-t-4 bg-muted/30 transition',
        m.top,
        allowed && 'border-primary/60 bg-primary/5',
        blocked ? 'border-dashed border-red-500 bg-red-500/5' : !allowed && 'border-border',
      )}
    >
      <header className="flex items-center justify-between px-3 py-2">
        <h2 className="text-sm font-bold tracking-wider">{m.title} · {count}</h2>
        {blocked && <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-bold text-white">Not allowed</span>}
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-3">
        {count === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{m.empty}</p> : children}
      </div>
    </section>
  );
}