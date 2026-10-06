import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { joinRoom, leaveRoom } from '@/lib/socket/socketClient';
import { useSocketEvent } from '@/lib/socket/useSocketEvent';
import { qk } from '@/lib/api/queryKeys';
import { useCartStore } from '@/stores/cartStore';
import type { Canteen, MenuItem } from '@/types';

export function useMenuLive(canteenId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!canteenId) return;
    const room = `canteen:${canteenId}:public`;
    joinRoom(room);
    return () => {
      leaveRoom(room);
    };
  }, [canteenId]);

  // Real-time menu item availability updates
  useSocketEvent('menu:availability_changed', ({ menuItemId, isAvailable }) => {
    // 1. Patch query cache for menu
    queryClient.setQueryData<MenuItem[]>(qk.menu(canteenId), (old) => {
      if (!old) return old;
      return old.map((item) =>
        item.id === menuItemId ? { ...item, isAvailable } : item
      );
    });

    // 2. If sold out, remove from cart and alert the student
    if (!isAvailable) {
      const cart = useCartStore.getState();
      const cartLine = cart.lines[menuItemId];
      if (cartLine && cart.canteenId === canteenId) {
        cart.remove(menuItemId);
        toast.error(`${cartLine.item.name} just sold out and was removed from your cart.`, {
          duration: 4000,
        });
      }
    }
  });

  // Real-time canteen status (open/closed)
  useSocketEvent('canteen:status_changed', (payload) => {
    if (payload.canteenId === canteenId) {
      queryClient.setQueryData<Canteen>(qk.canteen(canteenId), (old) => {
        if (!old) return old;
        return { ...old, isOpen: payload.isOpen };
      });

      queryClient.setQueryData<Canteen[]>(qk.canteens, (old) => {
        if (!old) return old;
        return old.map((c) =>
          c.id === canteenId ? { ...c, isOpen: payload.isOpen } : c
        );
      });
    }
  });

  // Real-time queue updates
  useSocketEvent('canteen:queue_updated', (payload) => {
    if (payload.canteenId === canteenId) {
      queryClient.setQueryData<Canteen>(qk.canteen(canteenId), (old) => {
        if (!old) return old;
        return {
          ...old,
          liveQueue: {
            activeOrders: payload.activeOrders,
            estimatedWaitMins: payload.estimatedWaitMins,
          },
        };
      });

      queryClient.setQueryData<Canteen[]>(qk.canteens, (old) => {
        if (!old) return old;
        return old.map((c) =>
          c.id === canteenId
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
    }
  });
}
