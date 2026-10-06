import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted';

const tones: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-amber-700',
  danger: 'bg-danger/10 text-danger',
  info: 'bg-info/10 text-info',
  muted: 'bg-muted text-muted-foreground',
};

export interface StatusPillProps {
  tone: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

// Colour is never the only signal: every pill carries text and (usually) an icon.
export const StatusPill: React.FC<StatusPillProps> = ({ tone, icon: Icon, children, className }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
      tones[tone],
      className
    )}
  >
    {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
    {children}
  </span>
);

export const KycBadge: React.FC<{ status: 'pending' | 'verified' | 'rejected' }> = ({ status }) => {
  if (status === 'verified') return <StatusPill tone="success" icon={CheckCircle2}>KYC verified</StatusPill>;
  if (status === 'rejected') return <StatusPill tone="danger" icon={XCircle}>KYC rejected</StatusPill>;
  return <StatusPill tone="warning" icon={Clock}>KYC pending</StatusPill>;
};

export const OpenBadge: React.FC<{ isOpen: boolean }> = ({ isOpen }) =>
  isOpen ? (
    <StatusPill tone="success" icon={CheckCircle2}>Open</StatusPill>
  ) : (
    <StatusPill tone="muted" icon={XCircle}>Closed</StatusPill>
  );