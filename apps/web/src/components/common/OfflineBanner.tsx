import React from 'react';
import { WifiOff } from 'lucide-react';
import { useIsOnline } from '@/lib/network/useOnlineStatus';
import { cn } from '@/lib/utils';

export type OfflineBannerVariant = 'student' | 'kitchen' | 'admin';

const COPY: Record<OfflineBannerVariant, string> = {
  student: "You're offline. Showing saved data.",
  kitchen: "You're offline. Showing the last known orders. New orders won't arrive until you're back online.",
  admin: "You're offline. Changes can't be saved until you reconnect.",
};

export const OfflineBanner: React.FC<{ variant: OfflineBannerVariant; className?: string }> = ({
  variant,
  className,
}) => {
  const online = useIsOnline();

  // The live region stays mounted so screen readers announce the message when it appears.
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <div
          className={cn(
            'flex w-full items-center justify-center gap-2 px-4 text-center font-medium',
            variant === 'kitchen'
              ? 'bg-red-600 py-3 text-base font-bold text-white'
              : 'bg-amber-100 py-2 text-xs text-amber-900',
            className
          )}
        >
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          <span>{COPY[variant]}</span>
        </div>
      )}
    </div>
  );
};