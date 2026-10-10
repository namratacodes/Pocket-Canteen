import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { kitchenApi } from '@/lib/api/kitchenApi';
import { kitchenKeys } from '@/lib/api/kitchenKeys';
import { useAuth } from '@/stores/authStore';
import type { StaffMenuItem } from '@/types/kitchen';
import { useSocketEvent } from '@/features/staff/deps';

type Listen = (event: string, handler: (p: any) => void) => void;
const listen = useSocketEvent as unknown as Listen;

export function patchItem(qc: QueryClient, id: string, patch: Partial<StaffMenuItem>) {
  qc.setQueryData<StaffMenuItem[]>(kitchenKeys.menu, (l) => l?.map((i) => (i.id === id ? { ...i, ...patch } : i)));
}

export const useStaffMenu = () => useQuery({ queryKey: kitchenKeys.menu, queryFn: kitchenApi.menu });

/** Keeps other tablets in sync. */
export function useMenuLive() {
  const qc = useQueryClient();
  listen('menu:availability_changed', (p: { menuItemId: string; isAvailable: boolean }) =>
    patchItem(qc, p.menuItemId, { isAvailable: p.isAvailable }),
  );
}

export function useSetAvailability() {
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  return useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) => kitchenApi.setAvailability(id, isAvailable),
    networkMode: 'always',
    onMutate: async ({ id, isAvailable }) => {
      await qc.cancelQueries({ queryKey: kitchenKeys.menu });
      const prev = qc.getQueryData<StaffMenuItem[]>(kitchenKeys.menu)?.find((i) => i.id === id);
      patchItem(qc, id, { isAvailable, updatedBy: user?.name, updatedAt: new Date().toISOString() });
      return { prev };
    },
    onError: (_e, v, ctx) => {
      if (ctx?.prev) patchItem(qc, v.id, ctx.prev);
      toast.error('Could not update availability');
    },
    onSuccess: (item) => patchItem(qc, item.id, item),
  });
}