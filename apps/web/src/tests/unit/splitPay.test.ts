import { describe, it, expect } from 'vitest';

function computeSplitPay(subtotal: number, walletBalance: number, useWallet: boolean) {
  const walletApplied = useWallet ? Math.min(walletBalance, subtotal) : 0;
  const gatewayAmount = +(subtotal - walletApplied).toFixed(2);
  const ctaText =
    gatewayAmount === 0
      ? 'Place Order (Paid by Wallet)'
      : `Pay ₹${gatewayAmount.toFixed(2)} & Place Order`;

  return { walletApplied, gatewayAmount, ctaText };
}

describe('Split-Pay Maths Unit Tests (P11 Spec)', () => {
  it('correctly splits when wallet balance is lower than subtotal (₹50 / ₹110 -> ₹50 + ₹60)', () => {
    const res = computeSplitPay(110, 50, true);
    expect(res.walletApplied).toBe(50);
    expect(res.gatewayAmount).toBe(60);
    expect(res.ctaText).toBe('Pay ₹60.00 & Place Order');
  });

  it('correctly covers total when wallet balance is higher than subtotal (₹200 / ₹110 -> ₹110 + ₹0)', () => {
    const res = computeSplitPay(110, 200, true);
    expect(res.walletApplied).toBe(110);
    expect(res.gatewayAmount).toBe(0);
    expect(res.ctaText).toBe('Place Order (Paid by Wallet)');
  });

  it('charges full gateway amount when useWallet is toggled off', () => {
    const res = computeSplitPay(110, 50, false);
    expect(res.walletApplied).toBe(0);
    expect(res.gatewayAmount).toBe(110);
    expect(res.ctaText).toBe('Pay ₹110.00 & Place Order');
  });

  it('charges full gateway amount when wallet balance is 0', () => {
    const res = computeSplitPay(75, 0, true);
    expect(res.walletApplied).toBe(0);
    expect(res.gatewayAmount).toBe(75);
    expect(res.ctaText).toBe('Pay ₹75.00 & Place Order');
  });
});
