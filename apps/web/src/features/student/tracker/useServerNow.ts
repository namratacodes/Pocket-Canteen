import { useEffect, useState } from 'react';
import { useNow } from '@/lib/hooks/useNow';
import { getClockOffset, syncServerClock } from '@/lib/time/serverClock';

/** Device time plus the server offset, ticking every second. */
export function useServerNow(): number {
  const tick = useNow(1000);
  const [, force] = useState(0);
  useEffect(() => {
    let alive = true;
    void syncServerClock().then(() => { if (alive) force((n) => n + 1); });
    const onVisible = () => { if (document.visibilityState === 'visible') force((n) => n + 1); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { alive = false; document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  return tick + getClockOffset();
}
