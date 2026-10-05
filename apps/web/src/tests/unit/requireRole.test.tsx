import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireRole } from '@/features/auth/RequireRole';
import { useAuth } from '@/stores/authStore';

describe('RequireRole Guard', () => {
  beforeEach(() => {
    useAuth.getState().clear();
  });

  it('renders FullPageSpinner when status is booting', () => {
    useAuth.setState({ status: 'booting', user: null, accessToken: null });

    render(
      <MemoryRouter initialEntries={['/student']}>
        <RequireRole role="student">
          <div>Protected Student Content</div>
        </RequireRole>
      </MemoryRouter>
    );

    expect(screen.getByTestId('full-page-spinner')).toBeInTheDocument();
    expect(screen.queryByText('Protected Student Content')).not.toBeInTheDocument();
  });

  it('redirects anonymous user to role login with encoded ?next parameter', () => {
    useAuth.setState({ status: 'anonymous', user: null, accessToken: null });

    render(
      <MemoryRouter initialEntries={['/staff/board']}>
        <Routes>
          <Route
            path="/staff/board"
            element={
              <RequireRole role="staff">
                <div>Protected Staff Content</div>
              </RequireRole>
            }
          />
          <Route path="/staff/login" element={<div>Staff Login Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Staff Login Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Staff Content')).not.toBeInTheDocument();
  });

  it('redirects user with wrong role to /403', () => {
    useAuth.setState({
      status: 'authenticated',
      accessToken: 'token_123',
      user: {
        id: 'usr_student',
        name: 'Student User',
        phone: '+919876543210',
        role: 'student',
        canteenId: null,
      },
    });

    render(
      <MemoryRouter initialEntries={['/staff/board']}>
        <Routes>
          <Route
            path="/staff/board"
            element={
              <RequireRole role="staff">
                <div>Protected Staff Board</div>
              </RequireRole>
            }
          />
          <Route path="/403" element={<div>403 Forbidden Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('403 Forbidden Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Staff Board')).not.toBeInTheDocument();
  });

  it('redirects user with mustChangePassword to /change-password', () => {
    useAuth.setState({
      status: 'authenticated',
      accessToken: 'token_123',
      user: {
        id: 'usr_staff_new',
        name: 'New Staff',
        phone: '+919876543211',
        role: 'staff',
        canteenId: 'canteen_1',
        mustChangePassword: true,
      },
    });

    render(
      <MemoryRouter initialEntries={['/staff/board']}>
        <Routes>
          <Route
            path="/staff/board"
            element={
              <RequireRole role="staff">
                <div>Protected Staff Board</div>
              </RequireRole>
            }
          />
          <Route
            path="/change-password"
            element={<div>Change Password Screen</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Change Password Screen')).toBeInTheDocument();
    expect(screen.queryByText('Protected Staff Board')).not.toBeInTheDocument();
  });

  it('renders children when authenticated with correct role', () => {
    useAuth.setState({
      status: 'authenticated',
      accessToken: 'token_123',
      user: {
        id: 'usr_staff',
        name: 'Ramesh',
        phone: '+919876543211',
        role: 'staff',
        canteenId: 'canteen_1',
        mustChangePassword: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/staff/board']}>
        <RequireRole role="staff">
          <div>Protected Kitchen Board View</div>
        </RequireRole>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Kitchen Board View')).toBeInTheDocument();
  });
});
