export const trackerKeys = {
  order: (id: string) => ['tracker', 'order', id] as const,
  active: ['tracker', 'active'] as const,
  past: ['tracker', 'past'] as const,
};
export const walletKeys = {
  balance: ['wallet'] as const,
  ledger: (type: string) => ['wallet', 'ledger', type] as const,
};