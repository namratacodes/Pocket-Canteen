import React from 'react';
import { Wallet as WalletIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatINR } from '@/lib/format';

interface WalletToggleProps {
  balance: number;
  useWallet: boolean;
  onToggle: (checked: boolean) => void;
}

export const WalletToggle: React.FC<WalletToggleProps> = ({
  balance,
  useWallet,
  onToggle,
}) => {
  // Section 4.4: hidden if balance = 0
  if (balance <= 0) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <WalletIcon className="h-5 w-5" />
        </div>
        <div>
          <Label htmlFor="use-wallet-switch" className="text-sm font-semibold text-foreground cursor-pointer">
            Use campus wallet
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {formatINR(balance)} available
          </p>
        </div>
      </div>

      <Switch
        id="use-wallet-switch"
        checked={useWallet}
        onCheckedChange={onToggle}
      />
    </div>
  );
};
