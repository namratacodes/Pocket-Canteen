import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/queryKeys';
import { useSocketEvent } from '@/lib/socket/useSocketEvent';
import type { Canteen, Wallet } from '@/types';

export function useCanteens() {
  const queryClient = useQueryClient();

  const canteensQuery = useQuery({
    queryKey: qk.canteens,
    queryFn: () => api<Canteen[]>('/canteens'),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const walletQuery = useQuery({
    queryKey: qk.wallet,
    queryFn: () => api<Wallet>('/wallet'),
    staleTime: 30000,
  });

  // Socket listener for canteen:status_changed
  useSocketEvent('canteen:status_changed', (payload) => {
    queryClient.setQueryData<Canteen[]>(qk.canteens, (old) => {
      if (!old) return old;
      return old.map((c) =>
        c.id === payload.canteenId ? { ...c, isOpen: payload.isOpen } : c
      );
    });
  });

  // Socket listener for canteen:queue_updated
  useSocketEvent('canteen:queue_updated', (payload) => {
    queryClient.setQueryData<Canteen[]>(qk.canteens, (old) => {
      if (!old) return old;
      return old.map((c) =>
        c.id === payload.canteenId
          ? {
              ...c,
              liveQueue: {
                activeOrders: payload.activeOrders,
                estimatedWaitMins: payload.estimatedWaitMins,
              },
            }
          : c
      );
    });
  });

  // Socket listener for wallet:updated
  useSocketEvent('wallet:updated', (payload) => {
    queryClient.setQueryData<Wallet>(qk.wallet, payload);
  });

  return {
    canteens: canteensQuery.data ?? [],
    isLoading: canteensQuery.isLoading,
    isError: canteensQuery.isError,
    error: canteensQuery.error,
    refetch: canteensQuery.refetch,
    wallet: walletQuery.data,
  };
}
