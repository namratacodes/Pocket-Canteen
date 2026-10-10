import { useSyncExternalStore } from 'react';
import { WifiOff } from 'lucide-react';
import { useConnection } from '@/stores/connectionStore';

const subscribe = (cb: () => void) => {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => { window.removeEventListener('online', cb); window.removeEventListener('offline', cb); };
};

export function ConnectionLostBanner() {
  const status = useConnection((s) => s.status);
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  // When the device itself is offline, the shell's OfflineBanner already says so.
  if (status === 'connected' || !online) return null;
  return (
    <div role="alert" className="flex items-center justify-center gap-2 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
      <WifiOff className="h-4 w-4" aria-hidden />
      Connection lost. New orders may not appear. Reconnecting…
    </div>
  );
}