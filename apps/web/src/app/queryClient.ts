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
      refetchOnWindowFocus: true,
    },
  },
});
