import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/features/staff/deps';
import { formatINR } from '@/lib/format';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { trackerKeys, walletKeys } from './keys';
import { patchOrder } from './orderEvents';
import type { TrackedOrder } from './types';

export function CancelOrderButton({ order }: { order: TrackedOrder }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const openRef = useRef(false);
  const paid = order.paymentStatus === 'paid';

  // The kitchen started cooking while the dialog was open: this button unmounts.
  useEffect(() => () => { if (openRef.current) toast.info('Too late. The kitchen already started your order'); }, []);

  const setDialog = (v: boolean) => { openRef.current = v; setOpen(v); };

  const confirm = async () => {
    const prevOrder = qc.getQueryData<TrackedOrder>(trackerKeys.order(order.id));
    const prevActive = qc.getQueryData<TrackedOrder[]>(trackerKeys.active);
    openRef.current = false;
    setOpen(false);
    setBusy(true);
    // optimistic: show cancelled right away
    qc.setQueryData<TrackedOrder>(trackerKeys.order(order.id), (o) =>
      o ? { ...o, status: 'cancelled', cancelReason: 'Cancelled by you', refundedAmount: paid ? o.totalAmount : 0, paymentStatus: paid ? 'refunded_to_wallet' : o.paymentStatus } : o,
    );
    qc.setQueryData<TrackedOrder[]>(trackerKeys.active, (l) => l?.filter((o) => o.id !== order.id));
    const rollback = () => {
      qc.setQueryData(trackerKeys.order(order.id), prevOrder);
      qc.setQueryData(trackerKeys.active, prevActive);
    };
    try {
      const r = await api<{ order: TrackedOrder; refundedAmount: number }>(`/orders/${order.id}/cancel`, { method: 'POST' });
      if (r.order) patchOrder(qc, r.order);
      usePickupCodeStore.getState().remove(order.id);
      void qc.invalidateQueries({ queryKey: walletKeys.balance });
      toast.success(r.refundedAmount > 0 ? `${formatINR(r.refundedAmount)} added to wallet` : 'Order cancelled');
    } catch (e) {
      rollback();
      const code = (e as { code?: string }).code;
      if (code === 'ALREADY_PREPARING') toast.error('Too late. The kitchen already started your order');
      else if (code === 'NOT_CANCELLABLE') { toast.error("This order can't be cancelled any more"); void qc.invalidateQueries({ queryKey: trackerKeys.order(order.id) }); }
      else toast.error('Could not cancel. Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" className="h-12 w-full" disabled={busy} onClick={() => setDialog(true)}>
        Cancel order
      </Button>
      <Dialog open={open} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel order {order.tokenNo}?</DialogTitle>
            <DialogDescription>
              {paid
                ? `${formatINR(order.totalAmount)} will be refunded to your Pocket wallet (not your bank).`
                : 'Any wallet amount on hold will be released.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" onClick={() => setDialog(false)}>Keep order</Button>
            <Button variant="destructive" className="h-12" onClick={confirm}>Yes, cancel order</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}