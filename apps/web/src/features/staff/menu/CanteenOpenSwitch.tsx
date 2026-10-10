import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { kitchenApi } from '@/lib/api/kitchenApi';
import { kitchenKeys } from '@/lib/api/kitchenKeys';
import { useKitchenSummary } from '../board/useKitchenOrders';

export function CanteenOpenSwitch({ canteenName }: { canteenName: string }) {
  const qc = useQueryClient();
  const { data } = useKitchenSummary();
  const [local, setLocal] = useState<boolean | null>(null);
  const [confirm, setConfirm] = useState(false);
  const isOpen = local ?? data?.isOpen ?? true;

  const m = useMutation({
    mutationFn: (v: boolean) => kitchenApi.setCanteenOpen(v),
    onMutate: (v) => { const prev = isOpen; setLocal(v); return { prev }; },
    onError: (_e, _v, ctx) => { setLocal(ctx?.prev ?? null); toast.error('Could not update canteen status'); },
    onSuccess: ({ isOpen: v }) => {
      setLocal(v);
      qc.setQueryData(kitchenKeys.summary, (d: object | undefined) => (d ? { ...d, isOpen: v } : d));
    },
  });

  return (
    <>
      <label className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Canteen</span>
        <Switch className="scale-125" checked={isOpen} onCheckedChange={(v) => (v ? m.mutate(true) : setConfirm(true))} aria-label="Canteen open" />
        <span className={`text-sm font-bold ${isOpen ? 'text-emerald-500' : 'text-red-500'}`}>{isOpen ? 'OPEN' : 'CLOSED'}</span>
      </label>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Close {canteenName}?</DialogTitle>
            <DialogDescription>Students won&apos;t be able to order.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-14" onClick={() => setConfirm(false)}>Keep open</Button>
            <Button variant="destructive" className="h-14" onClick={() => { setConfirm(false); m.mutate(false); }}>Close canteen</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}