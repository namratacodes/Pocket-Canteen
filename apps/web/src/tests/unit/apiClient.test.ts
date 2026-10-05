import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError } from '@/lib/api/client';
import { useAuth } from '@/stores/authStore';

describe('apiClient', () => {
  beforeEach(() => {
    useAuth.getState().clear();
    vi.restoreAllMocks();
  });

  it('normalizes network errors into ApiError with code NETWORK and status 0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    );

    await expect(api('/test-endpoint')).rejects.toThrowError(ApiError);

    try {
      await api('/test-endpoint');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(0);
      expect(err.code).toBe('NETWORK');
      expect(err.message).toBe("Can't reach server");
    }
  });

  it('parses error envelopes when server returns non-ok status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
        json: async () => ({
          error: {
            code: 'ITEM_UNAVAILABLE',
            message: 'Masala Dosa is sold out',
            details: { menuItemId: 'dosa_1' },
          },
        }),
      })
    );

    try {
      await api('/orders');
      expect.fail('Should have thrown an ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(409);
      expect(err.code).toBe('ITEM_UNAVAILABLE');
      expect(err.message).toBe('Masala Dosa is sold out');
      expect(err.details).toEqual({ menuItemId: 'dosa_1' });
    }
  });

  it('handles 401 and performs single-flight refresh for parallel requests', async () => {
    useAuth.getState().setSession({
      accessToken: 'old_expired_token',
      user: {
        id: 'usr_1',
        name: 'Student',
        phone: '+919876543210',
        role: 'student',
        canteenId: null,
      },
    });

    let refreshCallCount = 0;

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/refresh')) {
        refreshCallCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'new_refreshed_token',
            user: {
              id: 'usr_1',
              name: 'Student',
              phone: '+919876543210',
              role: 'student',
              canteenId: null,
            },
          }),
        });
      }

      if (url.includes('/data')) {
        // If request used old token, return 401
        // If request used new token, return 200
        const isAuthHeader = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]?.[1]?.headers?.Authorization;
        if (isAuthHeader === 'Bearer new_refreshed_token') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          });
        }

        return Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({
            error: { code: 'UNAUTHORIZED', message: 'Token expired' },
          }),
        });
      }

      return Promise.reject(new Error('Unknown url'));
    });

    vi.stubGlobal('fetch', mockFetch);

    // Fire 3 parallel requests
    const [res1, res2, res3] = await Promise.all([
      api<{ success: boolean }>('/data-1'),
      api<{ success: boolean }>('/data-2'),
      api<{ success: boolean }>('/data-3'),
    ]);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);

    // CRITICAL: parallel requests should trigger only ONE refresh call
    expect(refreshCallCount).toBe(1);
    expect(useAuth.getState().accessToken).toBe('new_refreshed_token');
  });
});
