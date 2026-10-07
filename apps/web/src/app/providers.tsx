import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { queryClient } from './queryClient';
import { useAuth } from '@/stores/authStore';
import { api } from '@/lib/api/client';
import { socket } from '@/lib/socket/socketClient';
import { FullPageSpinner } from '@/components/common/FullPageSpinner';
import type { AuthResponse } from '@/types';
import { PwaPrompts } from '@/pwa/PwaPrompts';

interface ProvidersProps {
  children: React.ReactNode;
}

const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, setSession, clear } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        const res = await api<AuthResponse>('/auth/refresh', { method: 'POST' });
        if (!isMounted) return;
        setSession(res);
        socket.connect();
      } catch {
        if (!isMounted) return;
        clear();
      }
    }

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [setSession, clear]);

  if (status === 'booting') {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
};

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: '1rem',
              fontFamily: 'Inter, sans-serif',
            },
          }}
        />
        <PwaPrompts />
      </AuthBootstrap>
    </QueryClientProvider>
  );
};
