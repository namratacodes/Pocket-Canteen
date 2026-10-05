import React from 'react';
import { Wallet as WalletIcon, ArrowDownLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Price } from '@/components/common/Price';
import { EmptyState } from '@/components/common/EmptyState';

export const WalletPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="pt-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Pocket Wallet
        </h2>
        <p className="text-xs text-muted-foreground">
          Closed-loop campus credits and instant cancellation refunds
        </p>
      </div>

      {/* Balance Card */}
      <Card className="border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card overflow-hidden shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Available Balance
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Campus Verified</span>
            </div>
          </div>

          <div className="mt-2 text-3xl font-extrabold text-foreground">
            <Price amount={50.0} />
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Usable across all 5 campus canteens. Refunds from cancelled orders credit here instantly.
          </p>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h3>

        <EmptyState
          icon={ArrowDownLeft}
          title="No Transactions Yet"
          description="Your wallet ledger transactions and cancellation credits will be listed here."
        />
      </div>
    </div>
  );
};
