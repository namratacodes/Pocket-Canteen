import React from 'react';
import { Button } from '@/components/ui/button';
import { DAYS, DAY_LABELS } from '../canteenSchema';
import { maskAccountRef, maskBank } from '../../shared/mask';
import type { StepProps } from './types';

export interface ReviewStepProps extends StepProps {
  onEdit: (step: number) => void;
}

const Section: React.FC<{ title: string; onEdit: () => void; children: React.ReactNode }> = ({
  title, onEdit, children,
}) => (
  <section className="rounded-xl border border-border p-4">
    <div className="mb-2 flex items-center justify-between">
      <h3 className="text-sm font-semibold">{title}</h3>
      <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
        Edit
      </Button>
    </div>
    <dl className="space-y-1 text-sm">{children}</dl>
  </section>
);

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="text-right font-medium">{value}</dd>
  </div>
);

export const ReviewStep: React.FC<ReviewStepProps> = ({ form, onEdit }) => {
  const v = form.getValues();
  return (
    <div className="space-y-3">
      <Section title="Basic" onEdit={() => onEdit(0)}>
        <Row label="Name" value={v.name} />
        <Row label="Location" value={v.location} />
        <Row label="Image" value={v.imageUrl || 'None'} />
      </Section>
      <Section title="Compliance" onEdit={() => onEdit(1)}>
        <Row label="FSSAI licence" value={<span className="font-mono">{v.fssaiLicenseNo}</span>} />
      </Section>
      <Section title="Operating hours" onEdit={() => onEdit(2)}>
        {DAYS.map((d) => {
          const h = v.operatingHours[d];
          return <Row key={d} label={DAY_LABELS[d]} value={h.closed ? 'Closed' : `${h.open} to ${h.close}`} />;
        })}
      </Section>
      <Section title="Payment" onEdit={() => onEdit(3)}>
        <Row label="Razorpay account" value={<span className="font-mono">{maskAccountRef(v.razorpayAccountRef)}</span>} />
        <Row label="Bank account" value={<span className="font-mono">{maskBank(v.bankAccountLast4)}</span>} />
        <Row label="KYC status" value={v.kycStatus} />
      </Section>
    </div>
  );
};