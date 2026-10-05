import React, { Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RoleRedirect } from '@/features/auth/RoleRedirect';
import { RequireRole } from '@/features/auth/RequireRole';
import { StudentLoginPage } from '@/features/auth/StudentLoginPage';
import { StaffLoginPage } from '@/features/auth/StaffLoginPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';

// Lazy-loaded Role Shells & Page subtrees
const StudentShell = React.lazy(() =>
  import('@/components/layout/StudentShell').then((m) => ({ default: m.StudentShell }))
);
const CanteenSelectorPage = React.lazy(() =>
  import('@/pages/student/CanteenSelectorPage').then((m) => ({ default: m.CanteenSelectorPage }))
);
const OrderHistoryPage = React.lazy(() =>
  import('@/pages/student/OrderHistoryPage').then((m) => ({ default: m.OrderHistoryPage }))
);
const WalletPage = React.lazy(() =>
  import('@/pages/student/WalletPage').then((m) => ({ default: m.WalletPage }))
);
const ProfilePage = React.lazy(() =>
  import('@/pages/student/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);

const StaffShell = React.lazy(() =>
  import('@/components/layout/StaffShell').then((m) => ({ default: m.StaffShell }))
);
const KitchenBoardPage = React.lazy(() =>
  import('@/pages/staff/KitchenBoardPage').then((m) => ({ default: m.KitchenBoardPage }))
);
const MenuManagerPage = React.lazy(() =>
  import('@/pages/staff/MenuManagerPage').then((m) => ({ default: m.MenuManagerPage }))
);
const StaffAnalyticsPage = React.lazy(() =>
  import('@/pages/staff/StaffAnalyticsPage').then((m) => ({ default: m.StaffAnalyticsPage }))
);

const AdminShell = React.lazy(() =>
  import('@/components/layout/AdminShell').then((m) => ({ default: m.AdminShell }))
);
const AdminOverviewPage = React.lazy(() =>
  import('@/pages/admin/AdminOverviewPage').then((m) => ({ default: m.AdminOverviewPage }))
);
const CanteenListPage = React.lazy(() =>
  import('@/pages/admin/CanteenListPage').then((m) => ({ default: m.CanteenListPage }))
);
const StaffProvisioningPage = React.lazy(() =>
  import('@/pages/admin/StaffProvisioningPage').then((m) => ({ default: m.StaffProvisioningPage }))
);
const SettlementsPage = React.lazy(() =>
  import('@/pages/admin/SettlementsPage').then((m) => ({ default: m.SettlementsPage }))
);

const ComponentShowcase = React.lazy(() =>
  import('@/pages/dev/ComponentShowcase').then((m) => ({ default: m.ComponentShowcase }))
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleRedirect />,
  },
  {
    path: '/login',
    element: <StudentLoginPage />,
  },
  {
    path: '/staff/login',
    element: <StaffLoginPage role="staff" />,
  },
  {
    path: '/admin/login',
    element: <StaffLoginPage role="admin" />,
  },
  {
    path: '/change-password',
    element: <ChangePasswordPage />,
  },

  // Student Subtree
  {
    path: '/student',
    element: (
      <RequireRole role="student">
        <Suspense fallback={<FullPageSpinner />}>
          <StudentShell />
        </Suspense>
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <CanteenSelectorPage />
          </Suspense>
        ),
      },
      {
        path: 'orders',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <OrderHistoryPage />
          </Suspense>
        ),
      },
      {
        path: 'wallet',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <WalletPage />
          </Suspense>
        ),
      },
      {
        path: 'profile',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <ProfilePage />
          </Suspense>
        ),
      },
    ],
  },

  // Staff Subtree
  {
    path: '/staff',
    element: (
      <RequireRole role="staff">
        <Suspense fallback={<FullPageSpinner />}>
          <StaffShell />
        </Suspense>
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/staff/board" replace />,
      },
      {
        path: 'board',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <KitchenBoardPage />
          </Suspense>
        ),
      },
      {
        path: 'menu',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <MenuManagerPage />
          </Suspense>
        ),
      },
      {
        path: 'analytics',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <StaffAnalyticsPage />
          </Suspense>
        ),
      },
    ],
  },

  // Admin Subtree
  {
    path: '/admin',
    element: (
      <RequireRole role="admin">
        <Suspense fallback={<FullPageSpinner />}>
          <AdminShell />
        </Suspense>
      </RequireRole>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <AdminOverviewPage />
          </Suspense>
        ),
      },
      {
        path: 'canteens',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <CanteenListPage />
          </Suspense>
        ),
      },
      {
        path: 'staff',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <StaffProvisioningPage />
          </Suspense>
        ),
      },
      {
        path: 'settlements',
        element: (
          <Suspense fallback={<FullPageSpinner />}>
            <SettlementsPage />
          </Suspense>
        ),
      },
    ],
  },

  // Dev Showcase (Accessible in dev & for admin)
  {
    path: '/dev/components',
    element: (
      <div className="min-h-screen bg-background p-8">
        <Suspense fallback={<FullPageSpinner />}>
          <ComponentShowcase />
        </Suspense>
      </div>
    ),
  },

  // Status and 404 routes
  {
    path: '/403',
    element: <ForbiddenPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
