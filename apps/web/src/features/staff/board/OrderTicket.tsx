import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { AlertTriangle, Check, KeyRound, Lock, MoreVertical, Play } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useNow } from '@/lib/hooks/useNow';
import type { KitchenColumn, KitchenOrder } from '@/types/kitchen';
import { timerInfo } from './timers';
import { TicketProgress, TicketTimer } from './TicketTimer';
import '../staff.css';

export interface TicketHandlers {
  onMove: (o: KitchenOrder, to: 'preparing' | 'ready') => void;
  onVerify: (o: KitchenOrder) => void;
  onCancel: (o: KitchenOrder) => void;
  onDetails: (o: KitchenOrder) => void;
}
export interface TicketProps extends TicketHandlers {
  order: KitchenOrder;
  column: KitchenColumn;
  pulse?: boolean;
  struck?: boolean;
  leaving?: boolean;
  compact?: boolean;
}

const chip = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold';

export const TicketCard = memo(function TicketCard({
  order, column, pulse, struck, leaving, compact, onMove, onVerify, onCancel, onDetails,
}: TicketProps) {
  const now = useNow(1000);
  const info = timerInfo(column, order, now);
  const overdue = !!info.overdue;
  const action =
    column === 'new'
      ? { label: 'Start cooking', icon: Play, cls: 'bg-sky-600 hover:bg-sky-500', run: () => onMove(order, 'preparing') }
      : column === 'preparing'
        ? { label: 'Mark ready', icon: Check, cls: 'bg-emerald-600 hover:bg-emerald-500', run: () => onMove(order, 'ready') }
        : { label: 'Verify & hand over', icon: KeyRound, cls: 'bg-primary hover:bg-primary/90', run: () => onVerify(order) };
  const Icon = action.icon;

  return (
    <article
      aria-label={`Order ${order.tokenNo}`}
      className={cn(
        'rounded-xl border-2 bg-card text-card-foreground shadow-sm transition duration-200',
        compact ? 'space-y-1.5 p-2' : 'space-y-2.5 p-3',
        overdue || (column === 'ready' && info.tone === 'red') ? 'border-red-500' : info.tone === 'amber' ? 'border-amber-500/70' : 'border-border',
        pulse && 'pc-pulse-ring',
        struck && 'opacity-60',
        leaving && 'scale-95 opacity-0',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={cn('font-mono text-3xl font-bold leading-none', struck && 'line-through')}>{order.tokenNo}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {pulse && <span className={cn(chip, 'bg-primary text-primary-foreground')}>NEW</span>}
            {order.isLocked && <span className={cn(chip, 'bg-red-500/15 text-red-500')}><Lock className="h-3 w-3" aria-hidden />Locked</span>}
            {overdue && <span className={cn(chip, 'bg-red-500/15 text-red-500')}><AlertTriangle className="h-3 w-3" aria-hidden />Overdue</span>}
            {struck && <span className={cn(chip, 'bg-muted text-muted-foreground')}>Cancelled</span>}
          </div>
        </div>
        <TicketTimer info={info} />
      </div>

      <ul className={cn('space-y-0.5', struck && 'line-through')}>
        {order.items.map((it) => (
          <li key={it.menuItemId} className="flex items-center gap-2 text-base">
            <span
              className={cn('h-3 w-3 shrink-0 rounded-sm border-2', it.isVeg === false ? 'border-red-600' : 'border-emerald-600')}
              aria-label={it.isVeg === false ? 'Non-veg' : 'Veg'}
            />
            <span><b>{it.quantity}×</b> {it.name}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="rounded bg-muted px-2 py-1 text-xs">Note: {order.note}</p>}

      {column === 'preparing' && <TicketProgress info={info} />}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{order.studentName}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label={`Actions for ${order.tokenNo}`} className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-muted">
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onDetails(order)}>View details</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onCancel(order)} className="text-red-500">Cancel order</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={action.run}
        disabled={struck}
        className={cn('flex h-14 w-full items-center justify-center gap-2 rounded-lg text-base font-bold uppercase tracking-wide text-white transition active:scale-[0.98] disabled:opacity-40', action.cls)}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {action.label}
      </button>
    </article>
  );
});

/** Draggable wrapper. Ready cards cannot be dragged (hand-over only through Verify Pickup). */
export function OrderTicket(props: TicketProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.order.id,
    data: { column: props.column, order: props.order },
    disabled: props.column === 'ready' || !!props.struck,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} role="group" className={isDragging ? 'opacity-30' : undefined}>
      <TicketCard {...props} />
    </div>
  );
}