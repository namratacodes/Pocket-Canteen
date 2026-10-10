import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/features/staff/deps';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';
import { cn } from '@/lib/utils';

const DAY = 24 * 60 * 60 * 1000;

interface Props {
  orderId: string;
  mode: 'masked' | 'revealed';
  large?: boolean;
  revealMs?: number;
}

function MissingCode({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setBusy(true);
    try {
      await api<{ sent: boolean }>(`/orders/${orderId}/pickup-code/resend`, { method: 'POST' });
      setSent(true);
    } catch (e) {
      const err = e as { status?: number; details?: { retryAfterSec?: number } };
      if (err.status === 429) setCooldown(err.details?.retryAfterSec ?? 30);
      else toast.error('Could not send the code. Try again');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-4 text-center">
      <p className="flex items-center justify-center gap-2 font-semibold"><Lock className="h-4 w-4" aria-hidden /> Pickup code</p>
      <p className="text-sm text-muted-foreground">Code not saved on this device.</p>
      {sent && <p className="text-sm text-emerald-600" role="status">Code sent by SMS to your registered number.</p>}
      <button
        type="button"
        onClick={resend}
        disabled={busy || cooldown > 0}
        className="h-12 w-full rounded-lg bg-primary font-semibold text-primary-foreground disabled:opacity-50"
      >
        {cooldown > 0 ? `Try again in ${cooldown}s` : sent ? 'Send again' : 'Send code by SMS'}
      </button>
    </div>
  );
}

export function PickupCodeCard({ orderId, mode, large = false, revealMs = 10_000 }: Props) {
  const entry = usePickupCodeStore((s) => s.codes[orderId]);
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const code = entry && Date.now() - entry.savedAt < DAY ? entry.code : null;
  if (!code) return <MissingCode orderId={orderId} />;

  const visible = mode === 'revealed' || shown;
  const spaced = code.split('').join(' ');
  const show = () => {
    setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), revealMs); // re-mask after 10s
  };
  const hide = () => { clearTimeout(timer.current); setShown(false); };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-center">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold"><Lock className="h-4 w-4" aria-hidden /> Pickup code</p>
        {mode === 'masked' && (
          <button type="button" onClick={visible ? hide : show} className="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium hover:bg-muted">
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            {visible ? 'Hide' : 'Show'}
          </button>
        )}
      </div>
      <p
        data-testid="pickup-code"
        aria-label={visible ? `Pickup code ${spaced}` : 'Pickup code hidden'}
        className={cn('my-3 font-mono font-bold tracking-widest', large ? 'text-6xl' : 'text-3xl')}
      >
        {visible ? spaced : '• • • •'}
      </p>
      <p className="text-xs text-muted-foreground">Say it only at the counter</p>
    </div>
  );
}