import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import type { Role } from '@/types';

interface RequireRoleProps {
  role: Role;
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children }) => {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'booting') {
    return <FullPageSpinner />;
  }

  if (status === 'anonymous' || !user) {
    const loginPaths: Record<Role, string> = {
      student: '/login',
      staff: '/staff/login',
      admin: '/admin/login',
    };
    const target = loginPaths[role] || '/login';
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`${target}?next=${next}`} replace />;
  }

  // Force password change check if required
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // Check role authorization
  if (user.role !== role) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
