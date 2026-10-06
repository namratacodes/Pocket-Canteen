import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DAYS, DAY_LABELS } from '../canteenSchema';
import type { StepProps } from './types';

export const HoursStep: React.FC<StepProps> = ({ form }) => {
  const { register, watch, setValue, getValues, formState: { errors } } = form;

  const copyMonday = () => {
    const mon = getValues('operatingHours.mon');
    DAYS.filter((d) => d !== 'mon').forEach((d) =>
      setValue(`operatingHours.${d}`, { ...mon }, { shouldDirty: true, shouldValidate: true })
    );
  };

  const rootError = (errors.operatingHours as { message?: string } | undefined)?.message;

  return (
    <div className="space-y-3">
      {DAYS.map((d) => {
        const closed = watch(`operatingHours.${d}.closed`);
        const dayErr = errors.operatingHours?.[d];
        return (
          <div key={d}>
            <div className="grid grid-cols-[5.5rem_1fr_auto_1fr_auto] items-center gap-2">
              <span className="text-sm font-medium">{DAY_LABELS[d]}</span>
              <Input
                type="time"
                aria-label={`${DAY_LABELS[d]} opening time`}
                disabled={closed}
                {...register(`operatingHours.${d}.open`)}
              />
              <span className="text-muted-foreground" aria-hidden>to</span>
              <Input
                type="time"
                aria-label={`${DAY_LABELS[d]} closing time`}
                disabled={closed}
                {...register(`operatingHours.${d}.close`)}
              />
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-brand"
                  {...register(`operatingHours.${d}.closed`)}
                />
                Closed
              </label>
            </div>
            {(dayErr?.open?.message || dayErr?.close?.message) && (
              <p role="alert" className="mt-1 pl-[5.5rem] text-xs text-danger">
                {dayErr?.open?.message ?? dayErr?.close?.message}
              </p>
            )}
          </div>
        );
      })}
      {rootError && (
        <p role="alert" className="text-xs text-danger">
          {rootError}
        </p>
      )}
      <Button type="button" variant="outline" size="sm" onClick={copyMonday}>
        Copy Monday to all
      </Button>
    </div>
  );
};