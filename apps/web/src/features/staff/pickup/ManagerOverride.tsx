import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { kitchenApi } from '@/lib/api/kitchenApi';
import type { KitchenOrder } from '@/types/kitchen';
import { PinPad } from './PinPad';

interface Props {
  orderId: string;
  token: string;
  onSuccess: (order: KitchenOrder) => void;
  onBack: () => void;
}

const MAX = 8;

export function ManagerOverride({ orderId, token, onSuccess, onBack }: Props) {
  const [pin, setPin] = useState('');
  const pinRef = useRef('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const set = (v: string) => { pinRef.current = v; setPin(v); };
  const digit = (d: string) => { if (!busy && pinRef.current.length < MAX) { set(pinRef.current + d); setError(''); } };
  const back = () => set(pinRef.current.slice(0, -1));

  const confirm = async () => {
    if (busy || pinRef.current.length < 4) return;
    setBusy(true);
    try {
      const { order } = await kitchenApi.overridePickup(orderId, pinRef.current);
      if (mounted.current) onSuccess(order);
    } catch (e) {
      if (!mounted.current) return;
      const status = (e as { status?: number }).status;
      set('');
      setBusy(false);
      if (status === 403) setError('Wrong manager PIN');
      else toast.error('Override failed. Try again');
    }
  };

  const kb = useRef<(e: KeyboardEvent) => void>();
  kb.current = (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (/^[0-9]$/.test(e.key)) digit(e.key);
    else if (e.key === 'Backspace') back();
    else if (e.key === 'Enter') void confirm();
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => kb.current?.(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="font-semibold">Manager override for {token}</p>
        <p className="text-sm text-muted-foreground">Ask a manager to enter their PIN.</p>
      </div>
      <div
        className="flex h-14 items-center justify-center rounded-xl border-2 border-border bg-card font-mono text-3xl tracking-[0.4em]"
        aria-label={`Manager PIN, ${pin.length} digits entered`}
      >
        {'•'.repeat(pin.length)}
      </div>
      <p className="min-h-5 text-center text-sm font-medium text-red-500" role="alert">{error}</p>
      <PinPad onDigit={digit} onBackspace={back} onClear={() => set('')} disabled={busy} />
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-14" onClick={onBack} disabled={busy}>Back</Button>
        <Button type="button" className="h-14" onClick={confirm} disabled={busy || pin.length < 4}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'Confirm'}
        </Button>
      </div>
    </div>
  );
}