import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Check, KeyRound, Loader2, Lock, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatINR } from '@/lib/format';
import { kitchenApi } from '@/lib/api/kitchenApi';
import { kitchenKeys } from '@/lib/api/kitchenKeys';
import type { KitchenOrder } from '@/types/kitchen';
import { exitOrder } from '../board/boardFx';
import { markLocked } from '../board/kitchenEvents';
import { useCanteenId } from '../board/useKitchenOrders';
import { CodeBoxes } from './CodeBoxes';
import { ManagerOverride } from './ManagerOverride';
import { PinPad } from './PinPad';
import '../staff.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orders: KitchenOrder[];
  initialOrderId?: string | null;
}

type Phase = 'entering' | 'submitting' | 'success' | 'locked' | 'rateLimited' | 'notReady';
const LEN = 4;
type Err = { status?: number; code?: string; details?: { attemptsLeft?: number; retryAfterSec?: number } };

const itemsLine = (o: KitchenOrder) => o.items.map((i) => `${i.quantity}× ${i.name}`).join(' · ');
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export function PickupVerifyModal({ open, onOpenChange, orders, initialOrderId }: Props) {
  const qc = useQueryClient();
  const key = kitchenKeys.orders(useCanteenId());

  const [target, setTarget] = useState<KitchenOrder | null>(null);
  const [code, setCode] = useState(''); // local state only, never logged or cached
  const codeRef = useRef('');
  const [phase, setPhase] = useState<Phase>('entering');
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [wrong, setWrong] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [retryIn, setRetryIn] = useState(0);
  const [override, setOverride] = useState(false);
  const [query, setQuery] = useState('');
  const mounted = useRef(true);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const st = useRef({ target, phase, attemptsLeft });
  st.current = { target, phase, attemptsLeft };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clearTimeout(closeTimer.current); };
  }, []);

  const setCodeBoth = (v: string) => { codeRef.current = v; setCode(v); };

  const select = (o: KitchenOrder | null) => {
    clearTimeout(closeTimer.current);
    setTarget(o);
    setCodeBoth('');
    setPhase(o?.isLocked ? 'locked' : 'entering');
    setAttemptsLeft(o?.verifyAttemptsLeft ?? 5);
    setWrong(false);
    setShakeKey(0);
    setOverride(false);
  };

  useEffect(() => {
    if (open) {
      setQuery('');
      select(ordersRef.current.find((o) => o.id === initialOrderId && o.status === 'ready') ?? null);
    } else {
      setCodeBoth('');
      clearTimeout(closeTimer.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialOrderId]);

  // 429 countdown
  useEffect(() => {
    if (phase !== 'rateLimited') return;
    const id = setInterval(() => {
      setRetryIn((n) => {
        if (n <= 1) { clearInterval(id); setPhase('entering'); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  const finish = (orderId: string) => {
    setPhase('success');
    setOverride(false);
    exitOrder(qc, key, orderId, 'leave');
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => { if (mounted.current) onOpenChange(false); }, 1500);
  };

  const submit = async (value: string) => {
    const t = st.current.target;
    if (!t) return;
    setPhase('submitting');
    try {
      await kitchenApi.verifyPickup(t.id, value);
      if (mounted.current) finish(t.id);
    } catch (e) {
      if (!mounted.current) return;
      const err = e as Err;
      setCodeBoth('');
      if (err.status === 423 || err.code === 'PICKUP_LOCKED') {
        setAttemptsLeft(0);
        setPhase('locked');
        qc.setQueryData<KitchenOrder[]>(key, (l) => (l ? markLocked(l, t.id) : l));
      } else if (err.status === 422 || err.code === 'PICKUP_CODE_INVALID') {
        const left = typeof err.details?.attemptsLeft === 'number' ? err.details.attemptsLeft : Math.max(0, st.current.attemptsLeft - 1);
        setAttemptsLeft(left);
        if (left <= 0) {
          setPhase('locked');
          qc.setQueryData<KitchenOrder[]>(key, (l) => (l ? markLocked(l, t.id) : l));
        } else {
          setWrong(true);
          setShakeKey((k) => k + 1);
          setPhase('entering');
        }
      } else if (err.status === 429 || err.code === 'RATE_LIMITED') {
        setRetryIn(err.details?.retryAfterSec ?? 30);
        setPhase('rateLimited');
      } else if (err.status === 409 || err.code === 'NOT_READY') {
        setPhase('notReady');
      } else {
        toast.error('Could not verify. Try again');
        setPhase('entering');
      }
    }
  };

  const push = (d: string) => {
    if (st.current.phase !== 'entering' || !st.current.target || codeRef.current.length >= LEN) return;
    const next = codeRef.current + d;
    setCodeBoth(next);
    if (next.length === LEN) void submit(next); // auto-submit at the 4th digit
  };
  const pop = () => { if (st.current.phase === 'entering') setCodeBoth(codeRef.current.slice(0, -1)); };

  const kb = useRef<(e: KeyboardEvent) => void>();
  kb.current = (e) => {
    if (!open || override || st.current.phase !== 'entering' || !st.current.target) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (/^[0-9]$/.test(e.key)) push(e.key);
    else if (e.key === 'Backspace') pop();
  };
  useEffect(() => {
    const f = (e: KeyboardEvent) => kb.current?.(e);
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const readyOrders = useMemo(() => orders.filter((o) => o.status === 'ready'), [orders]);
  const matches = useMemo(() => {
    const q = norm(query);
    return readyOrders.filter((o) => !q || norm(o.tokenNo).includes(q) || norm(o.studentName).includes(q));
  }, [readyOrders, query]);

  const busy = phase === 'submitting';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" aria-hidden /> Verify Pickup
          </DialogTitle>
          <DialogDescription>Ask the student for their 4-digit pickup code.</DialogDescription>
        </DialogHeader>

        {phase === 'success' && target ? (
          <div className="rounded-xl bg-emerald-600 p-6 text-center text-white" role="status">
            <Check className="mx-auto mb-2 h-12 w-12" aria-hidden />
            <p className="text-2xl font-bold">Hand over {target.tokenNo}</p>
            <ul className="mt-3 space-y-1 text-lg">
              {target.items.map((i) => (
                <li key={i.menuItemId}>{i.quantity}× {i.name}</li>
              ))}
            </ul>
          </div>
        ) : override && target ? (
          <ManagerOverride orderId={target.id} token={target.tokenNo} onSuccess={() => finish(target.id)} onBack={() => setOverride(false)} />
        ) : (
          <div className="space-y-4">
            {/* Token picker */}
            {!target ? (
              <div className="space-y-2">
                <label htmlFor="pickup-token-search" className="text-sm font-medium">Token</label>
                <input
                  id="pickup-token-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a token or name"
                  className="h-12 w-full rounded-lg border border-border bg-card px-3 text-base"
                  autoComplete="off"
                />
                {matches.length === 0 ? (
                  <p className="py-3 text-center text-sm text-muted-foreground">No Ready orders match</p>
                ) : (
                  <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
                    {matches.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => select(o)}
                        className="h-14 rounded-lg border border-border bg-card px-3 text-left hover:bg-muted"
                      >
                        <span className="font-mono text-lg font-bold">{o.tokenNo}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{o.studentName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Token</p>
                    <p className="font-mono text-3xl font-bold">{target.tokenNo}</p>
                  </div>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => select(null)}>Change</Button>
                </div>
                <div className="text-sm">
                  <p>{itemsLine(target)}</p>
                  <p className="text-muted-foreground">{target.studentName} · {formatINR(target.totalAmount)}</p>
                </div>

                {phase === 'locked' && (
                  <div className="space-y-3 rounded-xl border border-red-500/50 bg-red-500/10 p-4" role="alert">
                    <p className="flex items-start gap-2 font-semibold text-red-500">
                      <Lock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                      {target.tokenNo} locked after 5 failed attempts. Manager override required.
                    </p>
                    <Button type="button" className="h-14 w-full" onClick={() => setOverride(true)}>Manager override</Button>
                  </div>
                )}

                {phase === 'notReady' && (
                  <div className="space-y-3 rounded-xl border border-amber-500/50 bg-amber-500/10 p-4" role="alert">
                    <p className="flex items-center gap-2 font-semibold text-amber-500">
                      <AlertTriangle className="h-5 w-5" aria-hidden /> This order isn&apos;t marked Ready yet
                    </p>
                    <Button type="button" variant="outline" className="h-12 w-full" onClick={() => onOpenChange(false)}>Close</Button>
                  </div>
                )}

                {phase === 'rateLimited' && (
                  <p className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 font-semibold text-amber-500" role="alert">
                    <Timer className="h-5 w-5" aria-hidden /> Too many attempts. Wait {retryIn}s
                  </p>
                )}

                {(phase === 'entering' || phase === 'submitting' || phase === 'rateLimited') && (
                  <>
                    <CodeBoxes value={code} length={LEN} shakeKey={shakeKey} />
                    <p
                      className={`min-h-5 text-center text-sm font-semibold ${attemptsLeft <= 1 ? 'text-red-500' : 'text-amber-500'}`}
                      role="alert"
                      aria-live="polite"
                    >
                      {wrong && phase === 'entering'
                        ? `Incorrect · ${attemptsLeft} ${attemptsLeft === 1 ? 'attempt' : 'attempts'} left`
                        : ''}
                    </p>
                    <div className="relative">
                      <PinPad onDigit={push} onBackspace={pop} onClear={() => setCodeBoth('')} disabled={busy || phase === 'rateLimited'} />
                      {busy && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/60">
                          <Loader2 className="h-8 w-8 animate-spin" aria-label="Verifying" />
                        </div>
                      )}
                    </div>
                    <p className="text-center text-xs text-muted-foreground">Attempts left: {attemptsLeft}</p>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}