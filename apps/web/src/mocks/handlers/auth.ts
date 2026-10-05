import { http, HttpResponse } from 'msw';
import { mockUsers, MockUserRecord } from '../db';
import type { AuthResponse, User } from '@/types';

const SESSION_KEY = 'pc_mock_session';

export const authHandlers = [
  // POST /auth/otp/send
  http.post('*/auth/otp/send', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { phone?: string };

    if (!body.phone) {
      return HttpResponse.json(
        { error: { code: 'INVALID_PHONE', message: 'Phone number is required.' } },
        { status: 400 }
      );
    }

    // Phone ending in 0000000000 simulates 429
    if (body.phone.endsWith('0000000000')) {
      return HttpResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many OTP requests. Please try again in 60 seconds.',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    return HttpResponse.json({
      sent: true,
      resendAfterSec: 30,
    });
  }),

  // POST /auth/otp/verify
  http.post('*/auth/otp/verify', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      phone?: string;
      otp?: string;
    };

    if (body.otp === '000000') {
      return HttpResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many verification attempts. Please wait 1 minute.',
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
          },
        }
      );
    }

    // Valid OTP is 123456
    if (body.otp !== '123456') {
      return HttpResponse.json(
        {
          error: {
            code: 'OTP_INVALID',
            message: 'Invalid OTP entered. Please try again.',
          },
        },
        { status: 400 }
      );
    }

    // Find student or dynamically create for test phone
    let record = mockUsers.find((u) => u.user.phone === body.phone);
    if (!record) {
      const newUser: User = {
        id: `usr_student_${Date.now()}`,
        name: '',
        phone: body.phone || '+919876543210',
        role: 'student',
        canteenId: null,
      };
      record = { user: newUser, secret: '123456' };
      mockUsers.push(record);
    }

    const authResponse: AuthResponse = {
      accessToken: `mock_jwt_access_${record.user.id}_${Date.now()}`,
      user: record.user,
    };

    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authResponse));
    }

    return HttpResponse.json(authResponse);
  }),

  // POST /auth/login (staff and admin)
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    if (!body.email || !body.password) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email and password are required.',
          },
        },
        { status: 400 }
      );
    }

    const record = mockUsers.find(
      (u) => u.user.email?.toLowerCase() === body.email?.toLowerCase()
    );

    if (!record || record.secret !== body.password) {
      return HttpResponse.json(
        {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password.',
          },
        },
        { status: 401 }
      );
    }

    if (record.isDisabled) {
      return HttpResponse.json(
        {
          error: {
            code: 'ACCOUNT_DISABLED',
            message: 'Your account has been disabled. Please contact the administrator.',
          },
        },
        { status: 403 }
      );
    }

    const authResponse: AuthResponse = {
      accessToken: `mock_jwt_access_${record.user.id}_${Date.now()}`,
      user: record.user,
    };

    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(authResponse));
    }

    return HttpResponse.json(authResponse);
  }),

  // POST /auth/refresh
  http.post('*/auth/refresh', async () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const authData = JSON.parse(stored) as AuthResponse;
          // Refresh the token string
          authData.accessToken = `mock_refreshed_jwt_${Date.now()}`;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(authData));
          return HttpResponse.json(authData);
        } catch {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    }

    return HttpResponse.json(
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'No active session or refresh cookie.',
        },
      },
      { status: 401 }
    );
  }),

  // POST /auth/logout
  http.post('*/auth/logout', async () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(SESSION_KEY);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // PATCH /auth/password
  http.patch('*/auth/password', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!body.newPassword || body.newPassword.length < 8) {
      return HttpResponse.json(
        {
          error: {
            code: 'WEAK_PASSWORD',
            message: 'Password must be at least 8 characters long.',
          },
        },
        { status: 400 }
      );
    }

    // Update session user mustChangePassword
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const authData = JSON.parse(stored) as AuthResponse;
          authData.user.mustChangePassword = false;
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(authData));
          const u = mockUsers.find((x) => x.user.id === authData.user.id);
          if (u) {
            u.user.mustChangePassword = false;
            u.secret = body.newPassword;
          }
        } catch {
          // ignore
        }
      }
    }

    return new HttpResponse(null, { status: 204 });
  }),

  // PATCH /me
  http.patch('*/me', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { name?: string };

    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        try {
          const authData = JSON.parse(stored) as AuthResponse;
          if (body.name !== undefined) {
            authData.user.name = body.name;
          }
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(authData));
          const u = mockUsers.find((x) => x.user.id === authData.user.id);
          if (u && body.name !== undefined) {
            u.user.name = body.name;
          }
          return HttpResponse.json(authData.user);
        } catch {
          // ignore
        }
      }
    }

    return HttpResponse.json(
      {
        id: 'usr_me',
        name: body.name || 'Student',
        phone: '+919876543210',
        role: 'student',
        canteenId: null,
      } as User
    );
  }),
];
