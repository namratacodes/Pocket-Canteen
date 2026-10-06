import { describe, expect, it } from 'vitest';
import { canteenSchema, defaultCanteenValues, type CanteenFormValues } from '@/features/admin/canteens/canteenSchema';
import { staffSchema } from '@/features/admin/staff/AddStaffDialog';

const valid = (over: Partial<CanteenFormValues> = {}): CanteenFormValues => ({
  ...structuredClone(defaultCanteenValues), // clone so tests can mutate hours safely
  name: 'Juice Corner',
  location: 'Library lawn',
  fssaiLicenseNo: '12345678901234',
  razorpayAccountRef: 'acc_AbC123xyz',
  bankAccountLast4: '4321',
  ...over,
});

const messages = (v: CanteenFormValues) => {
  const r = canteenSchema.safeParse(v);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
};

describe('canteenSchema', () => {
  it('accepts a complete, valid canteen', () => {
    expect(canteenSchema.safeParse(valid()).success).toBe(true);
  });

  it('step 1: name length and required location', () => {
    expect(messages(valid({ name: 'ab' }))[0]).toMatch(/^name:/);
    expect(messages(valid({ name: 'x'.repeat(101) }))[0]).toMatch(/^name:/);
    expect(messages(valid({ location: '  ' }))[0]).toMatch(/^location:/);
    expect(messages(valid({ imageUrl: 'not a url' }))[0]).toMatch(/^imageUrl:/);
    expect(canteenSchema.safeParse(valid({ imageUrl: 'https://example.com/a.jpg' })).success).toBe(true);
  });

  it('step 2: FSSAI must be exactly 14 digits', () => {
    expect(messages(valid({ fssaiLicenseNo: '1234567890123' }))).toHaveLength(1);
    expect(messages(valid({ fssaiLicenseNo: '123456789012345' }))).toHaveLength(1);
    expect(messages(valid({ fssaiLicenseNo: '1234567890123a' }))).toHaveLength(1);
  });

  it('step 3: close must be after open, and one day must be open', () => {
    const bad = valid();
    bad.operatingHours.mon = { open: '22:00', close: '08:00', closed: false };
    expect(messages(bad).some((m) => m.startsWith('operatingHours.mon.close'))).toBe(true);
    bad.operatingHours.mon = { open: '08:00', close: '08:00', closed: false };
    expect(messages(bad).some((m) => m.startsWith('operatingHours.mon.close'))).toBe(true);

    const allClosed = valid();
    (Object.keys(allClosed.operatingHours) as (keyof typeof allClosed.operatingHours)[]).forEach((d) => {
      allClosed.operatingHours[d] = { open: '', close: '', closed: true };
    });
    expect(messages(allClosed)).toContain('operatingHours: At least one day must be open');
  });

  it('step 3: a closed day needs no times', () => {
    const v = valid();
    v.operatingHours.sun = { open: '', close: '', closed: true };
    expect(canteenSchema.safeParse(v).success).toBe(true);
  });

  it('step 4: Razorpay ref and bank last 4', () => {
    expect(messages(valid({ razorpayAccountRef: 'rzp_123456' }))[0]).toMatch(/^razorpayAccountRef:/);
    expect(messages(valid({ razorpayAccountRef: 'acc_12345' }))[0]).toMatch(/^razorpayAccountRef:/);
    expect(messages(valid({ bankAccountLast4: '123' }))[0]).toMatch(/^bankAccountLast4:/);
    expect(messages(valid({ bankAccountLast4: '12345' }))[0]).toMatch(/^bankAccountLast4:/);
  });
});

describe('staffSchema', () => {
  const ok = { name: 'Ramesh K', email: 'ramesh@main.pc', phone: '9876543210', canteenId: 'canteen_main' };
  it('accepts valid staff', () => expect(staffSchema.safeParse(ok).success).toBe(true));
  it('rejects bad phone numbers', () => {
    expect(staffSchema.safeParse({ ...ok, phone: '5876543210' }).success).toBe(false);
    expect(staffSchema.safeParse({ ...ok, phone: '98765' }).success).toBe(false);
  });
  it('requires email and canteen', () => {
    expect(staffSchema.safeParse({ ...ok, email: 'nope' }).success).toBe(false);
    expect(staffSchema.safeParse({ ...ok, canteenId: '' }).success).toBe(false);
  });
});