import { z } from 'zod';
import type { AdminCanteen, CreateCanteenInput, Weekday } from '@/types/admin';

export const DAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_LABELS: Record<Weekday, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayHours = z.object({ open: z.string(), close: z.string(), closed: z.boolean() });

export const canteenSchema = z
  .object({
    // Step 1: Basic
    name: z.string().trim().min(3, 'Name must be at least 3 characters').max(100, 'Name must be 100 characters or fewer'),
    location: z.string().trim().min(1, 'Location is required'),
    imageUrl: z
      .string()
      .trim()
      .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Enter a full image URL starting with https://'),
    // Step 2: Compliance
    fssaiLicenseNo: z.string().regex(/^\d{14}$/, 'FSSAI licence number must be exactly 14 digits'),
    // Step 3: Hours
    operatingHours: z.object({
      mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours,
      fri: dayHours, sat: dayHours, sun: dayHours,
    }),
    // Step 4: Payment
    razorpayAccountRef: z
      .string()
      .regex(/^acc_[A-Za-z0-9]{6,}$/, 'Use the Razorpay account id, like acc_AbC123xyz'),
    bankAccountLast4: z.string().regex(/^\d{4}$/, 'Enter the last 4 digits of the bank account'),
    kycStatus: z.enum(['pending', 'verified', 'rejected']),
  })
  .superRefine((v, ctx) => {
    let openDays = 0;
    DAYS.forEach((d) => {
      const h = v.operatingHours[d];
      if (h.closed) return;
      openDays += 1;
      if (!TIME_RE.test(h.open)) {
        ctx.addIssue({ code: 'custom', path: ['operatingHours', d, 'open'], message: 'Set an opening time' });
      }
      if (!TIME_RE.test(h.close)) {
        ctx.addIssue({ code: 'custom', path: ['operatingHours', d, 'close'], message: 'Set a closing time' });
      } else if (TIME_RE.test(h.open) && h.close <= h.open) {
        ctx.addIssue({
          code: 'custom',
          path: ['operatingHours', d, 'close'],
          message: 'Closing time must be after opening time',
        });
      }
    });
    if (openDays === 0) {
      ctx.addIssue({ code: 'custom', path: ['operatingHours'], message: 'At least one day must be open' });
    }
  });

export type CanteenFormValues = z.infer<typeof canteenSchema>;

// Fields validated before leaving each step (index 0-3). Step 5 is read-only review.
export const STEP_FIELDS: (keyof CanteenFormValues)[][] = [
  ['name', 'location', 'imageUrl'],
  ['fssaiLicenseNo'],
  ['operatingHours'],
  ['razorpayAccountRef', 'bankAccountLast4', 'kycStatus'],
];
export const STEP_LABELS = ['Basic', 'Compliance', 'Hours', 'Payment', 'Review'];

export const defaultCanteenValues: CanteenFormValues = {
  name: '',
  location: '',
  imageUrl: '',
  fssaiLicenseNo: '',
  operatingHours: {
    mon: { open: '08:00', close: '22:00', closed: false },
    tue: { open: '08:00', close: '22:00', closed: false },
    wed: { open: '08:00', close: '22:00', closed: false },
    thu: { open: '08:00', close: '22:00', closed: false },
    fri: { open: '08:00', close: '22:00', closed: false },
    sat: { open: '08:00', close: '22:00', closed: false },
    sun: { open: '', close: '', closed: true },
  },
  razorpayAccountRef: '',
  bankAccountLast4: '',
  kycStatus: 'pending',
};

export function toCreateInput(v: CanteenFormValues): CreateCanteenInput {
  return {
    name: v.name.trim(),
    location: v.location.trim(),
    imageUrl: v.imageUrl.trim() || undefined,
    fssaiLicenseNo: v.fssaiLicenseNo,
    operatingHours: v.operatingHours,
    payment: {
      razorpayAccountRef: v.razorpayAccountRef,
      bankAccountLast4: v.bankAccountLast4,
      kycStatus: v.kycStatus,
    },
  };
}

export function fromCanteen(c: AdminCanteen): CanteenFormValues {
  return {
    name: c.name,
    location: c.location,
    imageUrl: c.imageUrl ?? '',
    fssaiLicenseNo: c.fssaiLicenseNo,
    operatingHours: c.operatingHours,
    razorpayAccountRef: c.payment.razorpayAccountRef,
    bankAccountLast4: c.payment.bankAccountLast4,
    kycStatus: c.payment.kycStatus,
  };
}