import { create } from 'zustand';
import type { User, AuthResponse } from '@/types';

export interface AuthState {
  status: 'booting' | 'authenticated' | 'anonymous';
  accessToken: string | null;
  user: User | null;
  setSession: (r: AuthResponse) => void;
  updateUser: (partial: Partial<User>) => void;
  clear: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  status: 'booting',
  accessToken: null,
  user: null,
  setSession: (r: AuthResponse) =>
    set({
      status: 'authenticated',
      accessToken: r.accessToken,
      user: r.user,
    }),
  updateUser: (partial: Partial<User>) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...partial } : null,
    })),
  clear: () =>
    set({
      status: 'anonymous',
      accessToken: null,
      user: null,
    }),
}));

export const authStore = useAuth;
