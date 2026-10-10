import { Skeleton } from '@/components/ui/skeleton';
import { formatINR } from '@/lib/format';
import { useCountUp } from './useCountUp';
import { useWallet } from './useWallet';

function Amount({ value }: { value: number }) {
  const shown = useCountUp(value);
  return <p className="text-4xl font-bold tabular-nums" data-testid="wallet-balance">{formatINR(shown)}</p>;
}

export function BalanceCard() {
  const { data, isLoading, isError } = useWallet();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 text-primary-foreground shadow-md">
      <p className="text-sm opacity-90">Pocket Wallet</p>
      {isLoading ? <Skeleton className="mt-2 h-10 w-40" /> : isError || !data ? <p className="mt-2 text-sm">Could not load your balance</p> : <Amount value={data.balance} />}
      <p className="mt-1 text-xs opacity-90">Usable at all canteens</p>
    </div>
  );
}