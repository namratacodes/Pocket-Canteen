import { useEffect } from 'react';
import { useIsOnline } from './useOnlineStatus';

const key = (scope: string) => `pc-last-sync:${scope}`;

function read(scope: string): number | null {
  try {
    const raw = localStorage.getItem(key(scope));
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function write(scope: string): void {
  try {
    localStorage.setItem(key(scope), String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

/**
 * Remembers when a screen's data was last known to be fresh (public data only: menus, canteens).
 * Returns that time while offline, and null while online.
 */
export function useLastSynced(scope: string, hasData: boolean): number | null {
  const online = useIsOnline();

  useEffect(() => {
    if (!hasData) return;
    if (navigator.onLine) write(scope); // opened (or reloaded) while online: data is fresh now
    const onOffline = () => write(scope); // connection just dropped: data was fresh until now
    window.addEventListener('offline', onOffline);
    return () => window.removeEventListener('offline', onOffline);
  }, [scope, hasData]);

  return online ? null : read(scope);
}