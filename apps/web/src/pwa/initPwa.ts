import { toast } from 'sonner';
import { useAuth } from '@/stores/authStore';
import { usePwa, type BeforeInstallPromptEvent } from './pwaStore';

/** Name of the service-worker cache that holds a user's orders and wallet (see vite.config.ts). */
export const USER_CACHE = 'api-user';

let updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

/** Activates the waiting version and reloads. Only call after the user taps Refresh. */
export const applyUpdate = (): Promise<void> => (updateSW ? updateSW(true) : Promise.resolve());

/** Forget cached orders and wallet so the next person on a shared phone never sees them. */
export async function clearUserCaches(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') await caches.delete(USER_CACHE);
  } catch {
    /* nothing to clear */
  }
}

const ONE_HOUR = 60 * 60 * 1000;

export function initPwa(): void {
  if (typeof window === 'undefined') return;

  // beforeinstallprompt fires once, early, so listen before React renders.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwa.getState().setInstallEvent(e as BeforeInstallPromptEvent);
  });
  window.addEventListener('appinstalled', () => {
    usePwa.getState().setInstallEvent(null);
    usePwa.getState().setInstalled(true);
  });

  // Logging out (or a session expiring) wipes the cached per-user API responses.
  useAuth.subscribe((state, prev) => {
    if (prev.status === 'authenticated' && state.status !== 'authenticated') {
      void clearUserCaches();
    }
  });

  // The dev server and mock mode use MSW's own service worker. Two workers can't share one scope.
  if (!import.meta.env.PROD || import.meta.env.VITE_USE_MOCKS === 'true') return;

  void import('virtual:pwa-register').then(({ registerSW }) => {
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        usePwa.getState().setNeedRefresh(true);
      },
      onOfflineReady() {
        toast.success('Ready to use offline', { duration: 4000 });
      },
      onRegisteredSW(_url, registration) {
        // Kitchen tablets stay open all day, so look for a new version every hour.
        if (registration) {
          setInterval(() => {
            if (navigator.onLine) void registration.update();
          }, ONE_HOUR);
        }
      },
    });
  });
}