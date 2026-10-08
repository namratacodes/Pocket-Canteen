import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/client';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import { adminCanteenKey } from '@/lib/api/featureKeys';
import type { AdminCanteen } from '@/types/admin';
import { canteenSchema, fromCanteen, toCreateInput, type CanteenFormValues } from './canteenSchema';
import { BasicStep } from './steps/BasicStep';
import { ComplianceStep } from './steps/ComplianceStep';
import { HoursStep } from './steps/HoursStep';

// Editable "Info" tab. Reuses the wizard's field components.
export const CanteenInfoForm: React.FC<{ canteen: AdminCanteen }> = ({ canteen }) => {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const form = useForm<CanteenFormValues>({
    resolver: zodResolver(canteenSchema),
    defaultValues: fromCanteen(canteen),
    mode: 'onTouched',
  });

  const onSave = form.handleSubmit(async (values) => {
    const { name, location, imageUrl, fssaiLicenseNo, operatingHours } = toCreateInput(values);
    setSaving(true);
    try {
      const updated = await adminApi.updateCanteen(canteen.id, { name, location, imageUrl, fssaiLicenseNo, operatingHours });
      qc.setQueryData(adminCanteenKey(canteen.id), updated);
      qc.invalidateQueries({ queryKey: queryKeys.admin.canteens });
      form.reset(fromCanteen(updated));
      toast.success('Canteen details saved');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_FSSAI') {
        form.setError('fssaiLicenseNo', { type: 'server', message: 'This FSSAI licence number is already registered.' });
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't save changes. Try again.");
      }
    } finally {
      setSaving(false);
    }
  });

  return (
    <Card className="max-w-2xl space-y-8 p-6">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Basic details</h2>
        <BasicStep form={form} />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Compliance</h2>
        <ComplianceStep form={form} />
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Operating hours</h2>
        <HoursStep form={form} />
      </section>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={!form.formState.isDirty || saving} onClick={() => form.reset(fromCanteen(canteen))}>
          Discard changes
        </Button>
        <Button type="button" disabled={!form.formState.isDirty || saving} onClick={onSave} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Save changes
        </Button>
      </div>
    </Card>
  );
};