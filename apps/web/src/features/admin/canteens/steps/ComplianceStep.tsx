import React from 'react';
import { Input } from '@/components/ui/input';
import { Field } from '../../shared/Field';
import type { StepProps } from './types';

export const ComplianceStep: React.FC<StepProps> = ({ form }) => {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-4">
      <Field
        label="FSSAI licence number"
        htmlFor="fssaiLicenseNo"
        error={errors.fssaiLicenseNo?.message}
        hint="14 digits, printed on the canteen's food licence."
      >
        <Input
          id="fssaiLicenseNo"
          inputMode="numeric"
          maxLength={14}
          placeholder="12345678901234"
          autoComplete="off"
          className="font-mono"
          {...register('fssaiLicenseNo')}
        />
      </Field>
    </div>
  );
};