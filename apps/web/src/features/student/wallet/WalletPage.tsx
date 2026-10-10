import { Info } from 'lucide-react';
import { BalanceCard } from './BalanceCard';
import { LedgerList } from './LedgerList';
import { useWalletLive } from './useWallet';

export function WalletPage() {
  useWalletLive();
  return (
    <main className="mx-auto max-w-md space-y-4 p-4 pb-24">
      <h1 className="text-xl font-bold">Wallet</h1>
      <BalanceCard />
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Refunds from cancelled orders are added here. The wallet can&apos;t be topped up directly.
      </p>
      <LedgerList />
    </main>
  );
}