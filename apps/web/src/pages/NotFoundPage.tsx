import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full rounded-3xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-muted text-muted-foreground mb-4">
          <HelpCircle className="h-8 w-8" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          404 Not Found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          The page or route you are looking for does not exist or may have been moved.
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
          <Button onClick={() => navigate('/')} className="gap-2 font-semibold">
            <Home className="h-4 w-4" />
            <span>Return to Home</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
