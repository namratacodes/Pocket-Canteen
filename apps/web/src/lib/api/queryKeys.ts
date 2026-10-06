export const qk = {
  me: ['me'] as const,
  canteens: ['canteens'] as const,
  canteen: (id: string) => ['canteens', id] as const,
  menu: (canteenId: string) => ['menu', canteenId] as const,
  combos: (canteenId: string) => ['combos', canteenId] as const,
  order: (id: string) => ['orders', id] as const,
  ordersActive: ['orders', 'active'] as const,
  ordersPast: ['orders', 'past'] as const,
  wallet: ['wallet'] as const,
  ledger: (type: string) => ['wallet', 'ledger', type] as const,
  kitchen: (canteenId: string) => ['kitchen', canteenId] as const,
  kitchenMenu: ['kitchen', 'menu'] as const,
  analytics: (name: string, params: object) => ['analytics', name, params] as const,
  admin: (name: string, params?: object) => ['admin', name, params ?? {}] as const,
};

// Backwards compatibility alias
export const queryKeys = {
  auth: {
    me: qk.me,
  },
  canteens: {
    all: qk.canteens,
    detail: (id: string) => qk.canteen(id),
    menu: (id: string) => qk.menu(id),
    combos: (id: string) => qk.combos(id),
  },
  orders: {
    all: ['orders'] as const,
    active: qk.ordersActive,
    past: qk.ordersPast,
    detail: (id: string) => qk.order(id),
  },
  kitchen: {
    orders: (canteenId: string) => qk.kitchen(canteenId),
  },
  wallet: {
    balance: qk.wallet,
    ledger: ['wallet', 'ledger'] as const,
  },
  admin: {
    
    
    settlementEntries: (id: string) => ['admin', 'settlement-entries', id] as const,
    staffList: (canteenId?: string) => ['admin', 'staff', canteenId ?? 'all'] as const,
    overview: ['admin', 'overview'] as const,
    canteens: ['admin', 'canteens'] as const,
    staff: ['admin', 'staff'] as const,
    settlements: (period?: string) => ['admin', 'settlements', period] as const,
  },
};
