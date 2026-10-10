import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatINR } from '@/lib/format';
import type { KitchenOrder } from '@/types/kitchen';

const t = (iso?: string) => (iso ? format(new Date(iso), 'h:mm:ss a') : '-');

export function OrderDetailsDialog({ order, onClose }: { order: KitchenOrder | null; onClose: () => void }) {
  return (
    <Dialog open={!!order} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        {order && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-2xl">{order.tokenNo}</DialogTitle>
              <DialogDescription>{order.studentName} · {order.status}</DialogDescription>
            </DialogHeader>
            <ul className="space-y-1">
              {order.items.map((i) => <li key={i.menuItemId}><b>{i.quantity}×</b> {i.name}</li>)}
            </ul>
            {order.note && <p className="rounded bg-muted p-2 text-sm">Note: {order.note}</p>}
            <dl className="grid grid-cols-2 gap-1 text-sm">
              <dt className="text-muted-foreground">Total</dt><dd>{formatINR(order.totalAmount)}</dd>
              <dt className="text-muted-foreground">Placed</dt><dd>{t(order.createdAt)}</dd>
              <dt className="text-muted-foreground">Started</dt><dd>{t(order.preparingAt)}</dd>
              <dt className="text-muted-foreground">Ready</dt><dd>{t(order.readyAt)}</dd>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}