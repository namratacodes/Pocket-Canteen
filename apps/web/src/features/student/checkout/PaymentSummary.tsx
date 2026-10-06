import React from 'react';
import { Price } from '@/components/common/Price';

interface PaymentSummaryProps {
  subtotal: number;
  walletApplied: number;
  gatewayAmount: number;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  subtotal,
  walletApplied,
  gatewayAmount,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Payment Breakdown
      </h3>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Item Total</span>
          <Price amount={subtotal} className="font-semibold text-foreground" />
        </div>

        {walletApplied > 0 && (
          <div className="flex items-center justify-between text-success">
            <span className="flex items-center gap-1">
              <span>Campus Wallet applied</span>
            </span>
            <span className="font-semibold tabular-nums">
              −{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(walletApplied)}
            </span>
          </div>
        )}

        <div className="border-t border-border/80 pt-2.5 flex items-center justify-between font-bold text-base text-foreground">
          <span>{gatewayAmount === 0 ? 'Total Due' : 'To Pay Online (UPI/Card)'}</span>
          <Price
            amount={gatewayAmount}
            className="text-lg font-bold text-brand"
          />
        </div>
      </div>
    </div>
  );
};
