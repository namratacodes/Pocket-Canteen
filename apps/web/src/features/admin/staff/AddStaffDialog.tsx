import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api/client';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import type { AdminCanteen, CreateStaffResponse } from '@/types/admin';
import { Field } from '../shared/Field';
import { selectClass } from '../shared/styles';

export const staffSchema = z.object({
  name: z.string().trim().min(2, 'Enter the staff member\'s name'),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number starting with 6-9'),
  canteenId: z.string().min(1, 'Choose a canteen'),
});
export type StaffFormValues = z.infer<typeof staffSchema>;

export interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canteens: AdminCanteen[];
  defaultCanteenId?: string;
  /** Receives the one-time credentials. Parent keeps them in state only. */
  onCreated: (res: CreateStaffResponse) => void;
}

export const AddStaffDialog: React.FC<AddStaffDialogProps> = ({
  open, onOpenChange, canteens, defaultCanteenId, onCreated,
}) => {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: '', email: '', phone: '', canteenId: defaultCanteenId ?? '' },
  });
  const { register, formState: { errors } } = form;

  useEffect(() => {
    if (open) form.reset({ name: '', email: '', phone: '', canteenId: defaultCanteenId ?? '' });
  }, [open, defaultCanteenId, form]);

  const submit = form.handleSubmit(async (values) => {
    setPending(true);
    try {
      // Called directly (not via useMutation) so the temp password never sits in a cache.
      const res = await adminApi.createStaff(values);
      qc.invalidateQueries({ queryKey: queryKeys.admin.staff });
      qc.invalidateQueries({ queryKey: queryKeys.admin.canteens });
      onOpenChange(false);
      onCreated(res);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_EXISTS') {
        form.setError('email', { type: 'server', message: 'A staff account with this email already exists.' });
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't create the account. Try again.");
      }
    } finally {
      setPending(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add staff</DialogTitle>
          <DialogDescription>
            We'll generate a temporary password. The staff member must change it at first sign-in.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Full name" htmlFor="staff-name" error={errors.name?.message}>
            <Input id="staff-name" autoComplete="off" {...register('name')} />
          </Field>
          <Field label="Email (their login)" htmlFor="staff-email" error={errors.email?.message}>
            <Input id="staff-email" type="email" autoComplete="off" {...register('email')} />
          </Field>
          <Field label="Mobile number" htmlFor="staff-phone" error={errors.phone?.message}>
            <Input id="staff-phone" inputMode="numeric" maxLength={10} autoComplete="off" {...register('phone')} />
          </Field>
          <Field label="Canteen" htmlFor="staff-canteen" error={errors.canteenId?.message}>
            <select id="staff-canteen" className={selectClass} {...register('canteenId')}>
              <option value="">Choose a canteen</option>
              {canteens.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending} className="gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};