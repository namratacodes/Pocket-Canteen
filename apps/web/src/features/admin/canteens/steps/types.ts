import type { UseFormReturn } from 'react-hook-form';
import type { CanteenFormValues } from '../canteenSchema';

export interface StepProps {
  form: UseFormReturn<CanteenFormValues>;
}