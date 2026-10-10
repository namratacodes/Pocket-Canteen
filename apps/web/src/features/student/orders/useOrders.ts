import { useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, useSocketEvent } from '@/features/staff/deps';
import { trackerKeys } from '../tracker/keys';
import { markCancelled, patchEta, patchOrder } from '../tracker/orderEvents';
import { studentBus } from '../tracker/studentBus';
import type { CancelledPayload, EtaPayload, Page, StatusChangedPayload, TrackedOrder } from '../tracker/types';

type Listen = (event: string, handler: (p: any) => void) => void;
const listen = useSocketEvent as unknown as Listen;

export const useActiveOrders = () =>
  useQuery({ queryKey: trackerKeys.active, queryFn: () => api<TrackedOrder[]>('/orders?scope=active'), refetchOnWindowFocus: true });

export function usePastOrders(enabled = true) {
  return useInfiniteQuery({
    queryKey: trackerKeys.past,
    enabled,
    queryFn: ({ pageParam }) => api<Page<TrackedOrder>>(`/orders?scope=past${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** Keeps the active list (Home banner, Active tab) in sync with live events. */
export function useActiveOrdersLive() {
  const qc = useQueryClient();
  const onStatus = (p: StatusChangedPayload) => {
    patchOrder(qc, p.order);
    if (p.to === 'completed') void qc.invalidateQueries({ queryKey: trackerKeys.past });
  };
  const onEta = (p: EtaPayload) => patchEta(qc, p);
  const onCancelled = (p: CancelledPayload) => {
    markCancelled(qc, p);
    void qc.invalidateQueries({ queryKey: trackerKeys.past });
  };
  listen('order:status_changed', onStatus);
  listen('order:eta_updated', onEta);
  listen('order:cancelled', onCancelled);
  useEffect(() => {
    const offs = [
      studentBus.on('order:status_changed', (p) => onStatus(p as StatusChangedPayload)),
      studentBus.on('order:eta_updated', (p) => onEta(p as EtaPayload)),
      studentBus.on('order:cancelled', (p) => onCancelled(p as CancelledPayload)),
    ];
    return () => offs.forEach((off) => off());
  });
}