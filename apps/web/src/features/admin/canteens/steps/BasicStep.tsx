import React from 'react';
import { Input } from '@/components/ui/input';
import { Field } from '../../shared/Field';
import type { StepProps } from './types';

export const BasicStep: React.FC<StepProps> = ({ form }) => {
  const { register, formState: { errors } } = form;
  return (
    <div className="space-y-4">
      <Field label="Canteen name" htmlFor="name" error={errors.name?.message}>
        <Input id="name" placeholder="Juice Corner" autoComplete="off" {...register('name')} />
      </Field>
      <Field label="Location" htmlFor="location" error={errors.location?.message} hint="Where students will find it on campus.">
        <Input id="location" placeholder="Block C, ground floor" autoComplete="off" {...register('location')} />
      </Field>
      <Field
        label="Image URL (optional)"
        htmlFor="imageUrl"
        error={errors.imageUrl?.message}
        hint="Paste a link for now. Image upload comes later."
      >
        <Input id="imageUrl" inputMode="url" placeholder="https://" autoComplete="off" {...register('imageUrl')} />
      </Field>
    </div>
  );
};