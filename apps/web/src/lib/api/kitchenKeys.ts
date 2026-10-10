export const kitchenKeys = {
  orders: (canteenId: string) => ['kitchen', canteenId] as const,
  menu: ['kitchen', 'menu'] as const,
  summary: ['kitchen', 'summary'] as const,
};