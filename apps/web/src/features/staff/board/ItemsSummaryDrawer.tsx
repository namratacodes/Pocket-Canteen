import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { KitchenOrder } from '@/types/kitchen';
import { summarizeItems } from './transitions';

export function ItemsSummaryDrawer({ open, onOpenChange, orders }: { open: boolean; onOpenChange: (o: boolean) => void; orders: KitchenOrder[] }) {
  const rows = summarizeItems(orders);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Items to prepare</SheetTitle>
          <SheetDescription>New and Preparing orders combined, so you can batch.</SheetDescription>
        </SheetHeader>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-muted-foreground">Nothing to prepare</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {rows.map((r) => (
              <li key={r.name} className="flex items-center gap-4 py-3">
                <span className="w-14 text-right font-mono text-3xl font-bold tabular-nums">{r.quantity}×</span>
                <span className="text-lg">{r.name}</span>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}