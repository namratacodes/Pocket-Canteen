import { http, HttpResponse } from 'msw';
import type { Wallet } from '@/types';

export let mockWallet: Wallet = {
  balance: 50.0,
  updatedAt: new Date().toISOString(),
};

export const resetMockWallet = () => {
  mockWallet = {
    balance: 50.0,
    updatedAt: new Date().toISOString(),
  };
};

export const setMockWalletBalance = (newBalance: number) => {
  mockWallet = {
    balance: Math.max(0, newBalance),
    updatedAt: new Date().toISOString(),
  };
};

export const walletHandlers = [
  http.get('/api/v1/wallet', () => {
    return HttpResponse.json(mockWallet);
  }),
];
