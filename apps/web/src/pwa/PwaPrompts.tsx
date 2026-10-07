import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/stores/authStore';
import { applyUpdate } from './initPwa';
import { usePwa } from './pwaStore';

const TOAST_ID = 'pwa-update';

/**
 * Shows "New version available" once a new version is waiting. It never reloads by itself.
 * - Kitchen staff: the label says "Refresh after the rush" so nobody reloads mid-service.
 * - During checkout: hidden until the student leaves checkout.
 */
export const PwaPrompts = (): null => {
  const needRefresh = usePwa((s) => s.needRefresh);
  const checkoutActive = usePwa((s) => s.checkoutActive);
  const role = useAuth((s) => s.user?.role);

  useEffect(() => {
    if (!needRefresh || checkoutActive) {
      toast.dismiss(TOAST_ID);
      return;
    }
    const isKitchen = role === 'staff';
    toast('New version available', {
      id: TOAST_ID,
      duration: Infinity,
      description: isKitchen ? 'The board keeps running on the current version until you refresh.' : undefined,
      action: {
        label: isKitchen ? 'Refresh after the rush' : 'Refresh',
        onClick: () => {
          void applyUpdate();
        },
      },
    });
  }, [needRefresh, checkoutActive, role]);

  return null;
};