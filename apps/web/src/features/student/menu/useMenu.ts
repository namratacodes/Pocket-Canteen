import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { qk } from '@/lib/api/queryKeys';
import type { Canteen, MenuItem, ComboSuggestion } from '@/types';

export function useMenu(canteenId: string) {
  const canteenQuery = useQuery({
    queryKey: qk.canteen(canteenId),
    queryFn: () => api<Canteen>(`/canteens/${canteenId}`),
    staleTime: 60000,
  });

  const menuQuery = useQuery({
    queryKey: qk.menu(canteenId),
    queryFn: () => api<MenuItem[]>(`/canteens/${canteenId}/menu`),
    staleTime: 5 * 60 * 1000, // 5 min as specified in P11
  });

  const combosQuery = useQuery({
    queryKey: qk.combos(canteenId),
    queryFn: () =>
      api<ComboSuggestion[]>(`/canteens/${canteenId}/combos`).catch(() => []),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    canteen: canteenQuery.data,
    menuItems: menuQuery.data ?? [],
    combos: combosQuery.data ?? [],
    isLoading: canteenQuery.isLoading || menuQuery.isLoading,
    isError: canteenQuery.isError || menuQuery.isError,
    error: canteenQuery.error || menuQuery.error,
    refetch: () => {
      canteenQuery.refetch();
      menuQuery.refetch();
      combosQuery.refetch();
    },
  };
}
