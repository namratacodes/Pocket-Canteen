import React from 'react';
import { useConnection } from '@/stores/connectionStore';
import { cn } from '@/lib/utils';

export interface ConnectionDotProps {
  showLabel?: boolean;
  className?: string;
}

export const ConnectionDot: React.FC<ConnectionDotProps> = ({
  showLabel = false,
  className,
}) => {
  const status = useConnection((state) => state.status);

  const meta = {
    connected: {
      color: 'bg-emerald-500',
      pulse: 'bg-emerald-400',
      text: 'Live',
      title: 'Connected to live server',
    },
    reconnecting: {
      color: 'bg-amber-500',
      pulse: 'bg-amber-400',
      text: 'Reconnecting…',
      title: 'Reconnecting to live server…',
    },
    offline: {
      color: 'bg-red-500',
      pulse: 'bg-red-400',
      text: 'Offline',
      title: 'Device is offline',
    },
  }[status];

  return (
    <div
      className={cn('inline-flex items-center gap-2 select-none', className)}
      title={meta.title}
      role="status"
      aria-label={meta.title}
    >
      <span className="relative flex h-2.5 w-2.5">
        {status !== 'offline' && (
          <span
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              meta.pulse
            )}
          />
        )}
        <span
          className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', meta.color)}
        />
      </span>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {meta.text}
        </span>
      )}
    </div>
  );
};
