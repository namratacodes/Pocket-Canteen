import React, { useEffect, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router-dom';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ApiError } from '@/lib/api/client';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import type { AdminCanteen } from '@/types/admin';
import {
  canteenSchema, defaultCanteenValues, STEP_FIELDS, STEP_LABELS, toCreateInput,
  type CanteenFormValues,
} from './canteenSchema';
import { BasicStep } from './steps/BasicStep';
import { ComplianceStep } from './steps/ComplianceStep';
import { HoursStep } from './steps/HoursStep';
import { PaymentStep } from './steps/PaymentStep';
import { ReviewStep } from './steps/ReviewStep';
import { cn } from '@/lib/utils';

const DRAFT_KEY = 'pc-onboard-draft';

function loadDraft(): { values: Partial<CanteenFormValues>; step: number } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { values?: Partial<CanteenFormValues>; step?: number };
    return { values: parsed.values ?? {}, step: Math.min(Math.max(parsed.step ?? 0, 0), 4) };
  } catch {
    return null;
  }
}

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [draft] = useState(loadDraft);
  const [step, setStep] = useState(draft?.step ?? 0);
  const [created, setCreated] = useState<AdminCanteen | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CanteenFormValues>({
    resolver: zodResolver(canteenSchema),
    defaultValues: { ...defaultCanteenValues, ...draft?.values },
    mode: 'onTouched',
  });
  const { isDirty } = form.formState;

  // Autosave the draft to sessionStorage on every change and step move.
  useEffect(() => {
    if (created) return;
    const save = () => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ values: form.getValues(), step }));
      } catch {
        /* storage unavailable: draft just won't persist */
      }
    };
    save();
    const sub = form.watch(save);
    return () => sub.unsubscribe();
  }, [form, step, created]);

  // Ask before leaving with unsaved changes.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !created && currentLocation.pathname !== nextLocation.pathname
  );

  const next = async () => {
    const ok = await form.trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => s + 1);
  };

  const onInvalid = (errors: FieldErrors<CanteenFormValues>) => {
    const keys = Object.keys(errors);
    const idx = STEP_FIELDS.findIndex((fields) => fields.some((f) => keys.includes(f)));
    if (idx >= 0) setStep(idx);
  };

  const onValid = async (values: CanteenFormValues) => {
    setSubmitting(true);
    try {
      const canteen = await adminApi.createCanteen(toCreateInput(values));
      sessionStorage.removeItem(DRAFT_KEY);
      qc.invalidateQueries({ queryKey: queryKeys.admin.canteens });
      qc.invalidateQueries({ queryKey: queryKeys.admin.overview });
      setCreated(canteen);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_FSSAI') {
        form.setError('fssaiLicenseNo', {
          type: 'server',
          message: 'This FSSAI licence number is already registered to another canteen.',
        });
        setStep(1);
      } else {
        toast.error(e instanceof Error ? e.message : "Couldn't onboard the canteen. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <Card className="space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
          <h1 className="text-2xl font-bold tracking-tight">{created.name} onboarded</h1>
          <p className="text-sm text-muted-foreground">
            Next, create a login for the staff who will run this canteen's kitchen board.
          </p>
          <div className="flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => navigate(`/admin/staff?canteenId=${created.id}&new=1`)}>
              Add staff for this canteen
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/canteens/${created.id}`)}>
              View canteen
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Onboard a canteen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your progress is saved in this browser tab until you finish.
        </p>
      </div>

      <ol className="flex items-center gap-2" aria-label="Progress">
        {STEP_LABELS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? 'step' : undefined}
            className="flex flex-1 items-center gap-2 text-sm"
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                i < step && 'border-success bg-success text-white',
                i === step && 'border-brand bg-brand text-white',
                i > step && 'border-border text-muted-foreground'
              )}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn('hidden md:inline', i === step ? 'font-semibold' : 'text-muted-foreground')}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">
          Step {step + 1} of {STEP_LABELS.length}: {STEP_LABELS[step]}
        </h2>

        {step === 0 && <BasicStep form={form} />}
        {step === 1 && <ComplianceStep form={form} />}
        {step === 2 && <HoursStep form={form} />}
        {step === 3 && <PaymentStep form={form} />}
        {step === 4 && <ReviewStep form={form} onEdit={setStep} />}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" disabled={step === 0 || submitting} onClick={() => setStep((s) => s - 1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={next} className="gap-2">
              Next <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <Button type="button" disabled={submitting} onClick={form.handleSubmit(onValid, onInvalid)} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Onboard canteen
            </Button>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Leave without finishing?"
        description="Your answers are kept in this browser tab, so you can come back to this form and continue."
        confirmText="Leave"
        cancelText="Stay"
        onConfirm={() => blocker.proceed?.()}
      />
    </div>
  );
};