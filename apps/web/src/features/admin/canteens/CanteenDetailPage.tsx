import React, { Suspense } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { ApiError } from '@/lib/api/client';
import { adminApi } from '@/lib/api/adminApi';
import { queryKeys } from '@/lib/api/queryKeys';
import { OpenBadge, KycBadge } from '../shared/StatusPill';
import { CanteenInfoForm } from './CanteenInfoForm';
import { CanteenPaymentTab } from './CanteenPaymentTab';
import { StaffList } from '../staff/StaffList';

// Recharts only loads when the Analytics tab is opened.
const AnalyticsDashboard = React.lazy(() =>
  import('@/features/analytics/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard }))
);

export const CanteenDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: queryKeys.admin.canteen(id),
    queryFn: () => adminApi.canteen(id),
    enabled: !!id,
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  if (query.isLoading) return <SkeletonCard lines={6} />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          icon={Store}
          title="Canteen not found"
          description="It may have been removed, or the link is wrong."
          action={<Button onClick={() => navigate('/admin/canteens')}>Back to canteens</Button>}
        />
      );
    }
    return <ErrorState title="Couldn't load this canteen" error={query.error} onRetry={() => query.refetch()} />;
  }
  const canteen = query.data;
  if (!canteen) return null;

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <Link to="/admin/canteens" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Canteens
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{canteen.name}</h1>
          <OpenBadge isOpen={canteen.isOpen} />
          <KycBadge status={canteen.payment.kycStatus} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{canteen.location}</p>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <CanteenInfoForm canteen={canteen} />
        </TabsContent>
        <TabsContent value="payment" className="mt-4">
          <CanteenPaymentTab canteen={canteen} />
        </TabsContent>
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" className="gap-2" onClick={() => navigate(`/admin/staff?canteenId=${canteen.id}&new=1`)}>
              <Plus className="h-4 w-4" aria-hidden /> Add staff
            </Button>
          </div>
          <StaffList canteenId={canteen.id} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <Suspense fallback={<SkeletonCard lines={6} />}>
            <AnalyticsDashboard canteenId={canteen.id} canteenName={canteen.name} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};