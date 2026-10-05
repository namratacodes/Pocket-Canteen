import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface SkeletonCardProps {
  lines?: number;
  hasImage?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  lines = 3,
  hasImage = false,
  className,
}) => {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {hasImage && <Skeleton className="h-44 w-full rounded-none" />}
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-3/5 rounded-lg" />
        <Skeleton className="h-4 w-2/5 rounded-lg" />
      </CardHeader>
      <CardContent className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              'h-4 rounded-lg',
              i === lines - 1 ? 'w-4/5' : 'w-full'
            )}
          />
        ))}
      </CardContent>
    </Card>
  );
};
