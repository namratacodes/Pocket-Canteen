import { memo } from 'react';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { formatINR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StaffMenuItem } from '@/types/kitchen';

interface Props {
  item: StaffMenuItem;
  selected: boolean;
  onSelect: (id: string, on: boolean) => void;
  onToggle: (id: string, isAvailable: boolean) => void;
}

export const AvailabilityRow = memo(function AvailabilityRow({ item, selected, onSelect, onToggle }: Props) {
  return (
    <li className="flex min-h-16 items-center gap-3 border-b border-border px-3 py-2">
      <input type="checkbox" className="h-5 w-5" checked={selected} onChange={(e) => onSelect(item.id, e.target.checked)} aria-label={`Select ${item.name}`} />
      <span className={cn('h-3 w-3 shrink-0 rounded-sm border-2', item.isVeg ? 'border-emerald-600' : 'border-red-600')} aria-label={item.isVeg ? 'Veg' : 'Non-veg'} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.name}</p>
        {!item.isAvailable && item.updatedBy && (
          <p className="text-xs text-muted-foreground">by {item.updatedBy} {format(new Date(item.updatedAt), 'h:mm a')}</p>
        )}
      </div>
      <span className="w-16 text-right tabular-nums">{formatINR(item.price)}</span>
      <span className={cn('w-20 text-sm font-semibold', item.isAvailable ? 'text-emerald-500' : 'text-red-500')}>
        {item.isAvailable ? 'Available' : 'Sold out'}
      </span>
      <Switch className="scale-125" checked={item.isAvailable} onCheckedChange={(v) => onToggle(item.id, v)} aria-label={`${item.name} availability`} />
    </li>
  );
});