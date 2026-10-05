import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StudentLoginPage } from '@/features/auth/StudentLoginPage';
import { useAuth } from '@/stores/authStore';

describe('StudentLoginPage Component', () => {
  beforeEach(() => {
    useAuth.getState().clear();
    vi.restoreAllMocks();
  });

  it('renders phone input and validates invalid mobile numbers', async () => {
    render(
      <MemoryRouter>
        <StudentLoginPage />
      </MemoryRouter>
    );

    expect(screen.getByText('Student Login')).toBeInTheDocument();
    const phoneInput = screen.getByRole('textbox', { name: /10-digit mobile number/i });
    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });

    // Enter short phone
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.click(sendOtpBtn);

    await waitFor(() => {
      expect(
        screen.getByText('Enter a valid 10-digit Indian mobile number')
      ).toBeInTheDocument();
    });
  });

  it('progresses to OTP step on valid phone submission and handles happy path', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/auth/otp/send')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ sent: true, resendAfterSec: 30 }),
        });
      }
      if (url.includes('/auth/otp/verify')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            accessToken: 'test_token',
            user: {
              id: 'usr_student_test',
              name: 'Shubh Kumar',
              phone: '+919876543210',
              role: 'student',
              canteenId: null,
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    vi.stubGlobal('fetch', mockFetch);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <StudentLoginPage />
      </MemoryRouter>
    );

    const phoneInput = screen.getByRole('textbox', { name: /10-digit mobile number/i });
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });

    const sendOtpBtn = screen.getByRole('button', { name: /Send OTP/i });
    fireEvent.click(sendOtpBtn);

    // Wait for step 2: Enter Verification Code
    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
      expect(screen.getByText('+919876543210')).toBeInTheDocument();
    });

    // Verify OTP button
    const verifyBtn = screen.getByRole('button', { name: /Verify Code/i });
    expect(verifyBtn).toBeInTheDocument();
  });

  it('displays error on invalid OTP', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/otp/send')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ sent: true, resendAfterSec: 30 }),
        });
      }
      if (url.includes('/auth/otp/verify')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: 'OTP_INVALID',
              message: 'Invalid OTP entered. Please try again.',
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    vi.stubGlobal('fetch', mockFetch);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <StudentLoginPage />
      </MemoryRouter>
    );

    const phoneInput = screen.getByRole('textbox', { name: /10-digit mobile number/i });
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    const otpInput = screen.getByRole('textbox');
    fireEvent.change(otpInput, { target: { value: '999999' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid 6-digit code/i)
      ).toBeInTheDocument();
    });
  });

  it('handles 429 rate limit during verification', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/otp/send')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ sent: true, resendAfterSec: 30 }),
        });
      }
      if (url.includes('/auth/otp/verify')) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => ({
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many attempts. Please try again later.',
            },
          }),
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    vi.stubGlobal('fetch', mockFetch);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <StudentLoginPage />
      </MemoryRouter>
    );

    const phoneInput = screen.getByRole('textbox', { name: /10-digit mobile number/i });
    fireEvent.change(phoneInput, { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('button', { name: /Send OTP/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    const otpInput = screen.getByRole('textbox');
    fireEvent.change(otpInput, { target: { value: '000000' } });

    await waitFor(() => {
      expect(
        screen.getByText(/Too many attempts/i)
      ).toBeInTheDocument();
    });
  });
});
