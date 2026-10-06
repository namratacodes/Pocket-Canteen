import React from 'react';
import { Input } from '@/components/ui/input';
import { Field } from '../../shared/Field';
import { selectClass } from '../../shared/styles';
import type { StepProps } from './types';

export const PaymentStep: React.FC<StepProps> = ({ form }) => {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-4">
      <Field
        label="Razorpay account reference"
        htmlFor="razorpayAccountRef"
        error={errors.razorpayAccountRef?.message}
        hint="Student payments go straight to this account."
      >
        <Input
          id="razorpayAccountRef"
          placeholder="acc_AbC123xyz"
          autoComplete="off"
          className="font-mono"
          {...register('razorpayAccountRef')}
        />
      </Field>
      <Field label="Bank account, last 4 digits" htmlFor="bankAccountLast4" error={errors.bankAccountLast4?.message}>
        <Input
          id="bankAccountLast4"
          inputMode="numeric"
          maxLength={4}
          placeholder="4321"
          autoComplete="off"
          className="font-mono"
          {...register('bankAccountLast4')}
        />
      </Field>
      <Field label="KYC status" htmlFor="kycStatus" error={errors.kycStatus?.message}>
        <select id="kycStatus" className={selectClass} {...register('kycStatus')}>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </Field>
    </div>
  );
};