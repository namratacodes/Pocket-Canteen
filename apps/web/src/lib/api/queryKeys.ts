export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  canteens: {
    all: ['canteens'] as const,
    detail: (id: string) => ['canteens', id] as const,
    menu: (id: string) => ['canteens', id, 'menu'] as const,
    combos: (id: string) => ['canteens', id, 'combos'] as const,
  },
  orders: {
    all: ['orders'] as const,
    active: ['orders', 'active'] as const,
    past: ['orders', 'past'] as const,
    detail: (id: string) => ['orders', id] as const,
  },
  kitchen: {
    orders: (canteenId: string) => ['kitchen', canteenId, 'orders'] as const,
  },
  wallet: {
    balance: ['wallet'] as const,
    ledger: ['wallet', 'ledger'] as const,
  },
  admin: {
    overview: ['admin', 'overview'] as const,
    canteens: ['admin', 'canteens'] as const,
    staff: ['admin', 'staff'] as const,
    settlements: (period?: string) => ['admin', 'settlements', period] as const,
  },
};
