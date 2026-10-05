import { useAuth } from '@/stores/authStore';
import type { AuthResponse, ApiErrorBody } from '@/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let refreshing: Promise<string | null> | null = null; // single-flight promise

export async function refreshToken(): Promise<string | null> {
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as AuthResponse;
    useAuth.getState().setSession(data);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';

  const doFetch = async (token?: string | null) => {
    try {
      return await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
        body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      });
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, 'NETWORK', "Can't reach server", err);
    }
  };

  let res = await doFetch(useAuth.getState().accessToken);

  if (res.status === 401 && !path.startsWith('/auth/')) {
    refreshing ??= refreshToken().finally(() => {
      refreshing = null;
    });

    const newToken = await refreshing;
    if (!newToken) {
      useAuth.getState().clear();
      throw new ApiError(401, 'UNAUTHENTICATED', 'Session expired');
    }

    res = await doFetch(newToken);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'UNKNOWN',
      body?.error?.message ?? res.statusText,
      body?.error?.details
    );
  }

  return res.status === 204 ? (undefined as T) : res.json();
}
