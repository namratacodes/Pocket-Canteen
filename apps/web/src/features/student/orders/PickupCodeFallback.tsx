import React from 'react';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TokenChip } from '@/components/common/TokenChip';
import { useIsOnline } from '@/lib/network/useOnlineStatus';

export interface PickupCodeFallbackProps {
  tokenNo: string;
  code: string;
  onRetry: () => void;
}

/**
 * Shown when an order can't be loaded but its token and pickup code are saved on this phone.
 * The student can always collect their food, even with no connection at all.
 */
export const PickupCodeFallback: React.FC<PickupCodeFallbackProps> = ({ tokenNo, code, onRetry }) => {
  const online = useIsOnline();
  return (
    <Card className="overflow-hidden rounded-2xl border border-border text-center shadow-card">
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Your Counter Token
          </span>
          <div className="flex justify-center pt-2">
            <TokenChip token={tokenNo} size="xl" />
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/50 p-4">
          <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <KeyRound className="h-4 w-4 text-brand" aria-hidden />
            <span>4-Digit Pickup Code</span>
          </div>
          <div
            data-testid="pickup-code"
            className="select-all font-mono text-4xl font-bold tabular-nums tracking-[0.4em] text-foreground"
          >
            {code}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Show this code to canteen staff when you collect your food
          </p>
        </div>

        <p role="status" className="text-xs text-muted-foreground">
          {online
            ? "We couldn't load the latest status of this order."
            : "You're offline. Your code is saved on this phone. The status will update when you're back online."}
        </p>
        {online && (
          <Button type="button" variant="outline" onClick={onRetry} className="min-h-[44px]">
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
};