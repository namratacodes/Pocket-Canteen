import { useEffect } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, useSocketEvent } from '@/features/staff/deps';
import { studentBus } from '../tracker/studentBus';
import { walletKeys } from '../tracker/keys';
import type { LedgerEntry, Page, Wallet } from '../tracker/types';

type Listen = (event: string, handler: (p: any) => void) => void;
const listen = useSocketEvent as unknown as Listen;

export type LedgerFilter = 'all' | 'credit' | 'debit';

export const useWallet = () => useQuery({ queryKey: walletKeys.balance, queryFn: () => api<Wallet>('/wallet') });

export function useLedger(type: LedgerFilter) {
  return useInfiniteQuery({
    queryKey: walletKeys.ledger(type),
    queryFn: ({ pageParam }) =>
      api<Page<LedgerEntry>>(`/wallet/ledger?type=${type}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`),
    initialPageParam: '',
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

/** wallet:updated patches the balance and refreshes the ledger. */
export function useWalletLive() {
  const qc = useQueryClient();
  const apply = (w: Wallet) => {
    qc.setQueryData(walletKeys.balance, w);
    void qc.invalidateQueries({ queryKey: ['wallet', 'ledger'] });
  };
  listen('wallet:updated', apply);
  useEffect(() => studentBus.on('wallet:updated', (p) => apply(p as Wallet)));
}