import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/stores/authStore';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';

export const RoleRedirect: React.FC = () => {
  const { status, user } = useAuth();

  if (status === 'booting') {
    return <FullPageSpinner />;
  }

  if (status === 'anonymous' || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  switch (user.role) {
    case 'student':
      return <Navigate to="/student" replace />;
    case 'staff':
      return <Navigate to="/staff/board" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};
