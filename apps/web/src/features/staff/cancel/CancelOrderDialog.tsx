import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatINR } from '@/lib/format';
import { kitchenApi } from '@/lib/api/kitchenApi';
import { kitchenKeys } from '@/lib/api/kitchenKeys';
import type { KitchenOrder } from '@/types/kitchen';
import { exitOrder } from '../board/boardFx';
import { useCanteenId } from '../board/useKitchenOrders';

const REASONS = ['Item out of stock', 'Kitchen equipment issue', 'Student requested', 'Other'] as const;

interface Props {
  order: KitchenOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelOrderDialog({ order, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const key = kitchenKeys.orders(useCanteenId());
  const [reason, setReason] = useState<string>('');
  const [other, setOther] = useState('');
  const [soldOut, setSoldOut] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setReason(''); setOther(''); setSoldOut(new Set()); setBusy(false); }
  }, [open, order?.id]);

  if (!order) return null;

  const valid = !!reason && (reason !== 'Other' || other.trim().length > 0);
  const uniqueItems = order.items.filter((it, i, a) => a.findIndex((x) => x.menuItemId === it.menuItemId) === i);
  const toggle = (id: string) =>
    setSoldOut((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const { refundedAmount } = await kitchenApi.cancelOrder(order.id, reason === 'Other' ? other.trim() : reason);
      const failed: string[] = [];
      if (reason === 'Item out of stock') {
        for (const id of soldOut) {
          try { await kitchenApi.setAvailability(id, false); } catch { failed.push(id); }
        }
        void qc.invalidateQueries({ queryKey: kitchenKeys.menu });
      }
      toast.success(`${order.tokenNo} cancelled · ${formatINR(refundedAmount ?? order.totalAmount)} refunded`);
      if (failed.length) toast.error('Some items could not be marked sold out. Check the Menu tab');
      exitOrder(qc, key, order.id, 'strike');
      onOpenChange(false);
    } catch (e) {
      const err = e as { code?: string };
      if (err.code === 'NOT_CANCELLABLE') {
        toast.error("This order can't be cancelled any more");
        void qc.invalidateQueries({ queryKey: key });
        onOpenChange(false);
      } else {
        toast.error('Cancel failed. Try again');
        setBusy(false);
      }
    }
  };

  const rowCls = 'flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-3';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-h-[95vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cancel order {order.tokenNo}?</DialogTitle>
          <DialogDescription>Choose a reason. The student is told why.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2" role="radiogroup" aria-label="Cancellation reason">
          {REASONS.map((r) => (
            <label key={r} className={rowCls}>
              <input type="radio" name="cancel-reason" className="h-5 w-5" checked={reason === r} onChange={() => setReason(r)} />
              <span>{r}</span>
            </label>
          ))}
          {reason === 'Other' && (
            <input
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Tell us why (required)"
              aria-label="Other reason"
              maxLength={200}
              className="h-12 w-full rounded-lg border border-border bg-card px-3"
            />
          )}
        </div>

        {reason === 'Item out of stock' && (
          <div className="space-y-2">
            {uniqueItems.map((it) => (
              <label key={it.menuItemId} className={rowCls}>
                <input type="checkbox" className="h-5 w-5" checked={soldOut.has(it.menuItemId)} onChange={() => toggle(it.menuItemId)} />
                <span>Also mark &quot;{it.name}&quot; as sold out</span>
              </label>
            ))}
          </div>
        )}

        <p className="flex items-start gap-2 text-sm text-amber-500">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {formatINR(order.totalAmount)} will be refunded to the student&apos;s wallet. This can&apos;t be undone.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-14" disabled={busy} onClick={() => onOpenChange(false)}>Keep order</Button>
          <Button type="button" variant="destructive" className="h-14" disabled={!valid || busy} onClick={submit}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'Cancel order'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}