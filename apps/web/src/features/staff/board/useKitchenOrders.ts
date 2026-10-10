import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/stores/authStore';
import { useConnection } from '@/stores/connectionStore';
import { kitchenApi } from '@/lib/api/kitchenApi';
import { kitchenKeys } from '@/lib/api/kitchenKeys';
import type { KitchenOrder } from '@/types/kitchen';
import { normalizeKitchenOrder } from './kitchenEvents';
import { columnOf } from './transitions';

export function useCanteenId(): string {
  const user = useAuth((s) => s.user);
  return user?.canteenId ?? '';
}

export function useKitchenOrders() {
  const canteenId = useCanteenId();
  const status = useConnection((s) => s.status);
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  return useQuery({
    queryKey: kitchenKeys.orders(canteenId),
    queryFn: async () => (await kitchenApi.orders()).map(normalizeKitchenOrder),
    enabled: !!canteenId,
    refetchInterval: status !== 'connected' && online ? 10_000 : false, // polling fallback
    refetchOnWindowFocus: true,
  });
}

export function useKitchenSummary() {
  return useQuery({ queryKey: kitchenKeys.summary, queryFn: kitchenApi.summary, refetchInterval: 60_000 });
}

export function useMoveOrder() {
  const qc = useQueryClient();
  const key = kitchenKeys.orders(useCanteenId());
  return useMutation({
    mutationFn: ({ id, to }: { id: string; to: 'preparing' | 'ready'; token: string }) => kitchenApi.moveOrder(id, to),
    networkMode: 'always',
    onMutate: async ({ id, to }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<KitchenOrder[]>(key);
      const now = new Date().toISOString();
      qc.setQueryData<KitchenOrder[]>(key, (l) =>
        l?.map((o) => (o.id === id ? { ...o, status: to, updatedAt: now, [to === 'preparing' ? 'preparingAt' : 'readyAt']: now } : o)),
      );
      return { prev };
    },
    onError: (e: { code?: string }, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(e?.code === 'INVALID_TRANSITION' ? 'Already moved by another device' : 'Update failed. Try again');
    },
    onSuccess: (order, v) => {
      qc.setQueryData<KitchenOrder[]>(key, (l) => l?.map((o) => (o.id === order.id ? normalizeKitchenOrder(order) : o)));
      if (v.to === 'ready') toast.success(`${v.token} is Ready · student notified`, { duration: 3000 });
    },
  });
}

export const isNewColumn = (o: KitchenOrder) => columnOf(o.status) === 'new';