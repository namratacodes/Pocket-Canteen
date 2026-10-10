import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketEvent, api } from '@/features/staff/deps';
import { useConnection } from '@/stores/connectionStore';
import { runAlert } from './alerts';
import { etaChange } from './countdown';
import { trackerKeys } from './keys';
import { markCancelled, patchEta, patchOrder } from './orderEvents';
import { studentBus } from './studentBus';
import type { CancelledPayload, EtaPayload, StatusChangedPayload, TrackedOrder, WalkPayload } from './types';

type Listen = (event: string, handler: (p: any) => void) => void;
const listen = useSocketEvent as unknown as Listen;

export interface EtaNotice { kind: 'later' | 'sooner'; newTime: string }

/** The order itself. Polls every 15s if the socket has been down for more than 10s, refetches on reconnect. */
export function useOrderQuery(id: string) {
  const status = useConnection((s) => s.status);
  const [downLong, setDownLong] = useState(false);

  useEffect(() => {
    if (status === 'connected') { setDownLong(false); return; }
    const t = setTimeout(() => setDownLong(true), 10_000);
    return () => clearTimeout(t);
  }, [status]);

  const q = useQuery({
    queryKey: trackerKeys.order(id),
    queryFn: () => api<TrackedOrder>(`/orders/${id}`),
    enabled: !!id,
    refetchInterval: downLong ? 15_000 : false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { refetch } = q;
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current !== 'connected' && status === 'connected') void refetch();
    prev.current = status;
  }, [status, refetch]);

  return q;
}

interface Opts {
  /** Called when the order completes or is cancelled (remove the saved pickup code here). */
  onTerminal?: (orderId: string, status: 'completed' | 'cancelled') => void;
}

export function useOrderLive(id: string, opts: Opts = {}) {
  const qc = useQueryClient();
  const o = useRef(opts);
  o.current = opts;
  const [walkCalled, setWalkCalled] = useState(false);
  const [etaNotice, setEtaNotice] = useState<EtaNotice | null>(null);

  const onStatus = useCallback((p: StatusChangedPayload) => {
    if (p.orderId !== id) return;
    patchOrder(qc, p.order);
    if (p.to === 'ready') runAlert({ kind: 'ready', tokenNo: p.order.tokenNo, counterLabel: p.order.counterLabel, orderId: id });
    if (p.to === 'completed') o.current.onTerminal?.(id, 'completed');
  }, [id, qc]);

  const onEta = useCallback((p: EtaPayload) => {
    if (p.orderId !== id) return;
    const prev = qc.getQueryData<TrackedOrder>(trackerKeys.order(id))?.targetPickupTime;
    patchEta(qc, p);
    const ch = etaChange(prev, p.targetPickupTime);
    if (ch && p.targetPickupTime) setEtaNotice({ kind: ch.kind, newTime: p.targetPickupTime });
  }, [id, qc]);

  const onWalk = useCallback((p: WalkPayload) => {
    if (p.orderId !== id) return;
    setWalkCalled(true);
    runAlert({ kind: 'walk', tokenNo: p.tokenNo, counterLabel: p.counterLabel, orderId: id });
  }, [id]);

  const onCancelled = useCallback((p: CancelledPayload) => {
    if (p.orderId !== id) return;
    markCancelled(qc, p);
    o.current.onTerminal?.(id, 'cancelled');
  }, [id, qc]);

  listen('order:status_changed', onStatus);
  listen('order:eta_updated', onEta);
  listen('order:call_to_walk', onWalk);
  listen('order:cancelled', onCancelled);

  // Mock simulator events (silent in real mode)
  useEffect(() => {
    const offs = [
      studentBus.on('order:status_changed', (p) => onStatus(p as StatusChangedPayload)),
      studentBus.on('order:eta_updated', (p) => onEta(p as EtaPayload)),
      studentBus.on('order:call_to_walk', (p) => onWalk(p as WalkPayload)),
      studentBus.on('order:cancelled', (p) => onCancelled(p as CancelledPayload)),
    ];
    return () => offs.forEach((off) => off());
  }, [onStatus, onEta, onWalk, onCancelled]);

  return { walkCalled, etaNotice, dismissNotice: () => setEtaNotice(null) };
}