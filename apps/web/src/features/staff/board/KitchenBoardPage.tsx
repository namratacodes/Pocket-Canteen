import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ClipboardList, Flame, KeyRound, Maximize, Volume2, VolumeX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useNow } from '@/lib/hooks/useNow';
import { useWakeLock } from '@/lib/hooks/useWakeLock';
import { useAuth } from '@/stores/authStore';
import { useConnection } from '@/stores/connectionStore';
import { useKitchenPrefs } from '@/stores/kitchenPrefsStore';
import type { KitchenColumn, KitchenOrder } from '@/types/kitchen';
import { PickupVerifyModal } from '../pickup/PickupVerifyModal';
import { CancelOrderDialog } from '../cancel/CancelOrderDialog';
import { useBoardFx } from './boardFx';
import { BoardSettings } from './BoardSettings';
import { ConnectionLostBanner } from './ConnectionLostBanner';
import { ItemsSummaryDrawer } from './ItemsSummaryDrawer';
import { KanbanColumn } from './KanbanColumn';
import { OrderDetailsDialog } from './OrderDetailsDialog';
import { OrderTicket, TicketCard } from './OrderTicket';
import { ShiftStartOverlay } from './ShiftStartOverlay';
import { canMove, columnOf, groupOrders } from './transitions';
import { useNagMode, useNewOrderAlerts } from './useAlerts';
import { useKitchenLive } from './useKitchenLive';
import { useKitchenOrders, useKitchenSummary, useMoveOrder } from './useKitchenOrders';
import '../staff.css';

const DevPanel = import.meta.env.DEV ? lazy(() => import('@/mocks/KitchenDevPanel')) : null;
const COLUMNS: KitchenColumn[] = ['new', 'preparing', 'ready'];
const noop = () => undefined;

function Clock() {
  return <span className="font-mono text-lg tabular-nums">{format(useNow(1000), 'h:mm:ss a')}</span>;
}

function LiveDot() {
  const status = useConnection((s) => s.status);
  const cfg = status === 'connected' ? ['bg-emerald-500', 'Live'] : status === 'reconnecting' ? ['bg-amber-500', 'Reconnecting'] : ['bg-red-500', 'Offline'];
  return (
    <span className="flex items-center gap-1.5 text-sm font-medium">
      <span className={`h-2.5 w-2.5 rounded-full ${cfg[0]}`} aria-hidden />
      {cfg[1]}
    </span>
  );
}

export function KitchenBoardPage() {
  const user = useAuth((s) => s.user);
  const { data: orders, isLoading, isError, refetch } = useKitchenOrders();
  const { data: summary } = useKitchenSummary();
  const prefs = useKitchenPrefs();
  const move = useMoveOrder();
  const fx = useBoardFx();

  const [started, setStarted] = useState(false);
  const dragging = useRef(false);
  const { flush } = useKitchenLive(dragging);
  const pulse = useNewOrderAlerts(orders);
  useNagMode(orders);
  useWakeLock(started);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [verify, setVerify] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [cancel, setCancel] = useState<KitchenOrder | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [details, setDetails] = useState<KitchenOrder | null>(null);
  const [itemsOpen, setItemsOpen] = useState(false);

  // Text size preference scales the whole page while the board is open
  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * prefs.fontScale}px`;
    return () => { document.documentElement.style.fontSize = ''; };
  }, [prefs.fontScale]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const onMove = useCallback((o: KitchenOrder, to: 'preparing' | 'ready') => move.mutate({ id: o.id, to, token: o.tokenNo }), [move]);
  const onVerify = useCallback((o: KitchenOrder) => setVerify({ open: true, orderId: o.id }), []);
  const onCancel = useCallback((o: KitchenOrder) => { setCancel(o); setCancelOpen(true); }, []);
  const onDetails = useCallback((o: KitchenOrder) => setDetails(o), []);
  const handlers = { onMove, onVerify, onCancel, onDetails };

  const onDragStart = (e: DragStartEvent) => { dragging.current = true; setActiveId(String(e.active.id)); };
  const onDragEnd = (e: DragEndEvent) => {
    dragging.current = false;
    setActiveId(null);
    const from = e.active.data.current?.column as KitchenColumn | undefined;
    const order = e.active.data.current?.order as KitchenOrder | undefined;
    const to = e.over?.id as KitchenColumn | undefined;
    if (from && to && order && from !== to) {
      if (canMove(from, to)) onMove(order, to as 'preparing' | 'ready');
      else toast.error('Not allowed. Move orders one step at a time');
    }
    flush();
  };
  const onDragCancel = () => { dragging.current = false; setActiveId(null); flush(); };

  const grouped = groupOrders(orders ?? []);
  const active = orders?.find((o) => o.id === activeId);
  const compact = prefs.density === 'compact';

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-[480px] flex-col gap-3 p-3">
      {!started && <ShiftStartOverlay onStart={() => setStarted(true)} />}
      <ConnectionLostBanner />

      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">{user?.canteenName ?? 'Canteen'} · Kitchen</h1>
          <LiveDot />
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => prefs.set({ soundOn: !prefs.soundOn })} aria-label={prefs.soundOn ? 'Mute sound' : 'Turn sound on'}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted">
              {prefs.soundOn ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
            </button>
            <BoardSettings />
            <button type="button" onClick={() => setVerify({ open: true, orderId: null })}
              className="flex h-12 items-center gap-2 rounded-lg bg-primary px-4 font-bold text-primary-foreground">
              <KeyRound className="h-5 w-5" aria-hidden /> Verify Pickup
            </button>
            <button type="button" onClick={() => setItemsOpen(true)} className="flex h-12 items-center gap-2 rounded-lg border border-border bg-card px-4 font-semibold hover:bg-muted">
              <ClipboardList className="h-5 w-5" aria-hidden /> Items
            </button>
            <button type="button" aria-label="Fullscreen" onClick={() => void document.documentElement.requestFullscreen?.()}
              className="flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted">
              <Maximize className="h-5 w-5" aria-hidden />
            </button>
            <Clock />
          </div>
        </div>
        {summary && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Today {summary.ordersToday} orders · Avg prep {summary.avgPrepMins} min
            {summary.isRush && <span className="flex items-center gap-1 font-semibold text-orange-500"><Flame className="h-4 w-4" aria-hidden />Rush hour</span>}
          </p>
        )}
      </header>

      {isError && !orders ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border">
          <p className="font-semibold">Could not load orders</p>
          <button type="button" onClick={() => void refetch()} className="h-12 rounded-lg bg-primary px-6 font-bold text-primary-foreground">Retry</button>
        </div>
      ) : isLoading ? (
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
          {COLUMNS.map((c) => (
            <div key={c} className="space-y-3 rounded-xl border border-border p-3">
              <Skeleton className="h-6 w-24" /><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
          <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
            {COLUMNS.map((col) => (
              <KanbanColumn key={col} column={col} count={grouped[col].length}>
                {grouped[col].map((o) => (
                  <OrderTicket
                    key={o.id} order={o} column={col} compact={compact}
                    pulse={pulse.has(o.id)} struck={fx.struck.has(o.id)} leaving={fx.leaving.has(o.id)}
                    {...handlers}
                  />
                ))}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {active && columnOf(active.status) && (
              <div className="rotate-2 scale-105 shadow-2xl">
                <TicketCard order={active} column={columnOf(active.status)!} compact={compact} onMove={noop} onVerify={noop} onCancel={noop} onDetails={noop} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <PickupVerifyModal open={verify.open} onOpenChange={(o) => setVerify((v) => ({ ...v, open: o }))} orders={orders ?? []} initialOrderId={verify.orderId} />
      <CancelOrderDialog order={cancel} open={cancelOpen} onOpenChange={setCancelOpen} />
      <OrderDetailsDialog order={details} onClose={() => setDetails(null)} />
      <ItemsSummaryDrawer open={itemsOpen} onOpenChange={setItemsOpen} orders={orders ?? []} />

      {DevPanel && new URLSearchParams(window.location.search).has('dev') && (
        <Suspense fallback={null}><DevPanel /></Suspense>
      )}
    </div>
  );
}