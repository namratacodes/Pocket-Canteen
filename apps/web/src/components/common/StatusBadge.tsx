import React from 'react';
import { Loader2 } from 'lucide-react';
import { statusMeta } from '@/lib/statusMeta';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderStatus, PaymentStatus } from '@/types';

export interface StatusBadgeProps { audience?: string;
  status: OrderStatus;
  paymentStatus?: PaymentStatus;
  isStudent?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  paymentStatus,
  isStudent = false,
  className,
}) => {
  if (paymentStatus === 'pending') {
    return (
      <Badge
        variant="info"
        className={cn('gap-1.5 font-medium py-1 px-2.5', className)}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Confirming payment…</span>
      </Badge>
    );
  }

  const meta = statusMeta[status] || statusMeta.placed;
  const Icon = meta.icon;
  const label = isStudent ? meta.studentLabel : meta.label;

  return (
    <Badge
      variant={meta.color === 'danger' ? 'destructive' : meta.color}
      className={cn('gap-1.5 font-medium py-1 px-2.5', className)}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Badge>
  );
};
