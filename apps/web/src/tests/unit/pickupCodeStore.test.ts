import { describe, it, expect, beforeEach } from 'vitest';
import { usePickupCodeStore } from '@/stores/pickupCodeStore';

describe('pickupCodeStore Unit Tests', () => {
  beforeEach(() => {
    usePickupCodeStore.getState().clear();
    localStorage.clear();
  });

  it('saves and retrieves pickup codes', () => {
    usePickupCodeStore.getState().save('ord_101', {
      code: '4721',
      tokenNo: 'A-14',
    });

    const codeData = usePickupCodeStore.getState().getCode('ord_101');
    expect(codeData).not.toBeNull();
    expect(codeData?.code).toBe('4721');
    expect(codeData?.tokenNo).toBe('A-14');
  });

  it('purges codes older than 24 hours', () => {
    const twentyFiveHoursAgo = Date.now() - 25 * 60 * 60 * 1000;

    usePickupCodeStore.getState().save('ord_old', {
      code: '9999',
      tokenNo: 'A-01',
      savedAt: twentyFiveHoursAgo,
    });

    // Getting the expired code returns null and purges it
    const codeData = usePickupCodeStore.getState().getCode('ord_old');
    expect(codeData).toBeNull();
  });

  it('removes code on order completion', () => {
    usePickupCodeStore.getState().save('ord_102', {
      code: '1234',
      tokenNo: 'B-02',
    });

    usePickupCodeStore.getState().remove('ord_102');
    expect(usePickupCodeStore.getState().getCode('ord_102')).toBeNull();
  });
});
