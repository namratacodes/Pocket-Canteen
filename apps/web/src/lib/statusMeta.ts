import {
  ClipboardList,
  ChefHat,
  BellRing,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import type { OrderStatus } from '@/types';

export interface StatusMetaItem {
  label: string;
  studentLabel: string;
  color: 'info' | 'warning' | 'success' | 'slate' | 'danger';
  icon: LucideIcon;
  column?: 'new' | 'preparing' | 'ready';
}

export const statusMeta: Record<OrderStatus, StatusMetaItem> = {
  placed: {
    label: 'New',
    studentLabel: 'Order received',
    color: 'info',
    icon: ClipboardList,
    column: 'new',
  },
  queued: {
    label: 'New',
    studentLabel: 'Order received',
    color: 'info',
    icon: ClipboardList,
    column: 'new',
  },
  preparing: {
    label: 'Preparing',
    studentLabel: 'Being prepared',
    color: 'warning',
    icon: ChefHat,
    column: 'preparing',
  },
  ready: {
    label: 'Ready',
    studentLabel: 'Ready for pickup',
    color: 'success',
    icon: BellRing,
    column: 'ready',
  },
  completed: {
    label: 'Completed',
    studentLabel: 'Collected',
    color: 'slate',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    studentLabel: 'Cancelled',
    color: 'danger',
    icon: XCircle,
  },
};
