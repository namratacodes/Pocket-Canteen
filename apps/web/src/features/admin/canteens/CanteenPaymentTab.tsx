import React from 'react';
import { Card } from '@/components/ui/card';
import type { AdminCanteen } from '@/types/admin';
import { KycBadge } from '../shared/StatusPill';
import { maskAccountRef, maskBank } from '../shared/mask';

export const CanteenPaymentTab: React.FC<{ canteen: AdminCanteen }> = ({ canteen }) => (
  <Card className="max-w-xl space-y-4 p-6">
    <p className="text-sm text-muted-foreground">
      Student payments for this canteen settle directly to the account below. Details are masked here.
    </p>
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Razorpay account</dt>
        <dd className="font-mono font-medium">{maskAccountRef(canteen.payment.razorpayAccountRef)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">Bank account</dt>
        <dd className="font-mono font-medium">{maskBank(canteen.payment.bankAccountLast4)}</dd>
      </div>
      <div className="flex items-center justify-between gap-4">
        <dt className="text-muted-foreground">KYC status</dt>
        <dd><KycBadge status={canteen.payment.kycStatus} /></dd>
      </div>
    </dl>
  </Card>
);