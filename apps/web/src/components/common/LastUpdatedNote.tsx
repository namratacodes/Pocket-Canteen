import React from 'react';
import { formatTime } from '@/lib/format';
import { useIsOnline } from '@/lib/network/useOnlineStatus';
import { useLastSynced } from '@/lib/network/useLastSynced';
import { cn } from '@/lib/utils';

export interface LastUpdatedNoteProps {
  /** Unique name for this screen's data, e.g. "canteens" or "menu:canteen_main". */
  scope: string;
  hasData: boolean;
  className?: string;
}

/** "Offline. Last updated 12:41 PM". Renders nothing while online. */
export const LastUpdatedNote: React.FC<LastUpdatedNoteProps> = ({ scope, hasData, className }) => {
  const online = useIsOnline();
  const syncedAt = useLastSynced(scope, hasData);

  if (online) return null;
  return (
    <p role="status" className={cn('text-xs font-medium text-amber-800', className)}>
      {syncedAt
        ? `Offline. Last updated ${formatTime(new Date(syncedAt).toISOString())}`
        : 'Offline. Showing saved data.'}
    </p>
  );
};