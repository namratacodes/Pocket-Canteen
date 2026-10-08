import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type AnalyticsName, type AnalyticsParams } from '@/lib/api/analyticsApi';
import { analyticsKey } from '@/lib/api/featureKeys';

// One query per card. retry:false so a down ML service shows its Retry state quickly.
export function useAnalytics<T>(name: AnalyticsName, params: AnalyticsParams) {
  return useQuery<T, Error>({
    queryKey: analyticsKey(name, params),
    queryFn: () => analyticsApi.get<T>(name, params),
    retry: false,
    staleTime: 60_000,
  });
}