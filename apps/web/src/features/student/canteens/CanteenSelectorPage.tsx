import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Wallet as WalletIcon, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useCanteens } from './useCanteens';
import { CanteenCard } from './CanteenCard';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { formatINR } from '@/lib/format';
import type { ApiError } from '@/lib/api/client';
import { LastUpdatedNote } from '@/components/common/LastUpdatedNote';
import { InstallAppCard } from '@/pwa/InstallAppCard';
import { ActiveOrderBanner } from '@/features/student/orders/ActiveOrderBanner';

export const CanteenSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);
  const { canteens, isLoading, isError, error, refetch, wallet } = useCanteens();
  const [searchQuery, setSearchQuery] = useState('');

  // Sort: open canteens first, then ascending estimatedWaitMins
  const sortedAndFilteredCanteens = useMemo(() => {
    let list = [...canteens];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      // 1. Open first
      if (a.isOpen && !b.isOpen) return -1;
      if (!a.isOpen && b.isOpen) return 1;

      // 2. Shortest wait time first
      const waitA = a.liveQueue?.estimatedWaitMins ?? 999;
      const waitB = b.liveQueue?.estimatedWaitMins ?? 999;
      return waitA - waitB;
    });
  }, [canteens, searchQuery]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header Greeting & Live Wallet Chip */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Hi {user?.name ? user.name.split(' ')[0] : 'there'} 👋
          </h1>
          <p className="text-xs text-muted-foreground">
            Skip the counter queue. Eat on time.
          </p>
        </div>

        <button
          onClick={() => navigate('/student/wallet')}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
          aria-label="View wallet balance"
        >
          <WalletIcon className="h-3.5 w-3.5 text-brand" />
          <span className="font-mono text-xs">
            {wallet ? formatINR(wallet.balance) : '₹--'}
          </span>
        </button>
      </div>

      <InstallAppCard />

      <LastUpdatedNote scope="canteens" hasData={canteens.length > 0} />

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search canteens or locations..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-1"
          >
            ✕
          </button>
        )}
      </div>

      {/* Main List Area */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        )}

        {isError && (
          <ErrorState
            error={error as ApiError | Error}
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && sortedAndFilteredCanteens.length === 0 && (
          <EmptyState
            icon={UtensilsCrossed}
            title={searchQuery ? 'No canteens match your search' : 'No canteens available'}
            description={
              searchQuery
                ? 'Try searching with a different keyword or location.'
                : 'Campus canteens will appear here once onboarded.'
            }
          />
        )}

        {!isLoading &&
          !isError &&
          sortedAndFilteredCanteens.map((canteen) => (
            <CanteenCard key={canteen.id} canteen={canteen} />
          ))}
      </div>
    </div>
  );
};
