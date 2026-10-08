import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 500 && failureCount < 2) {
          return true;
        }
        return false;
      },
      staleTime: 30_000,
      // Still try the request when offline, so the saved copy from the service worker can answer
      // instead of the screen going blank.
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: true,
    },
    // Never hold an action (order, payment, settlement) while offline and replay it later.
    mutations: {
      networkMode: 'always',
    },
  },
});
