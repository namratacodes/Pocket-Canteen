import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/stores/authStore';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuth((state) => state.user);

  const handleHomeClick = () => {
    if (user?.role === 'staff') {
      navigate('/staff/board');
    } else if (user?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/student');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full rounded-3xl border border-destructive/20 bg-card p-8 shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          403 Forbidden
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          You don't have permission to access this resource. Your account is logged in as{' '}
          <strong className="text-foreground uppercase font-mono">{user?.role || 'Guest'}</strong>.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
          <Button onClick={handleHomeClick} className="gap-2 font-semibold">
            <Home className="h-4 w-4" />
            <span>Go to My Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
