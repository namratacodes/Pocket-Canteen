// Query keys used by the admin portal and the analytics dashboard.
export const adminCanteenKey = (id: string) => ['admin', 'canteens', id] as const;

export const analyticsKey = (name: string, params: object) => ['analytics', name, params] as const;
