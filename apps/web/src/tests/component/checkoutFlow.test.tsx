import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutPage } from '@/features/student/checkout/CheckoutPage';
import { useCartStore } from '@/stores/cartStore';
import { useAuth } from '@/stores/authStore';
import type { MenuItem } from '@/types';

const mockItem1: MenuItem = {
  id: 'item_samosa',
  canteenId: 'canteen_main',
  name: 'Samosa (2 pc)',
  price: 20,
  category: 'Snacks',
  isAvailable: true,
  isVeg: true,
  basePrepSeconds: 180,
};

const mockItem2: MenuItem = {
  id: 'item_chai',
  canteenId: 'canteen_main',
  name: 'Masala Chai',
  price: 15,
  category: 'Drinks',
  isAvailable: true,
  isVeg: true,
  basePrepSeconds: 120,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/checkout']}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CheckoutPage Component Flow', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    useAuth.getState().setSession({
      accessToken: 'test_token',
      user: {
        id: 'usr_student_1',
        name: 'Shubh K.',
        phone: '+919876543210',
        role: 'student',
        canteenId: null,
      },
    });
    vi.restoreAllMocks();
  });

  it('renders order summary and split-pay breakdown from cart', async () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen'); // 20
    useCartStore.getState().add(mockItem2, 'Main Canteen'); // 15
    // Subtotal: 35

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/wallet')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ balance: 50.0, updatedAt: new Date().toISOString() }),
        });
      }
      if (url.includes('/predict/eta-preview')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ estimatedPrepSeconds: 420 }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    vi.stubGlobal('fetch', mockFetch);

    renderWithProviders(<CheckoutPage />);

    expect(screen.getByText('Checkout')).toBeInTheDocument();
    expect(screen.getByText('Samosa (2 pc)')).toBeInTheDocument();
    expect(screen.getByText('Masala Chai')).toBeInTheDocument();

    // Check payment summary elements
    await waitFor(() => {
      expect(screen.getByText('Use campus wallet')).toBeInTheDocument();
      expect(screen.getByText('Campus Wallet applied')).toBeInTheDocument();
    });

    // Wallet (50) covers total (35) -> Place Order (Paid by Wallet)
    expect(
      screen.getByRole('button', { name: /Place Order \(Paid by Wallet\)/i })
    ).toBeInTheDocument();
  });

  it('handles ITEM_UNAVAILABLE 409 error and provides Remove & Continue recovery', async () => {
    useCartStore.getState().add(mockItem1, 'Main Canteen'); // Samosa
    useCartStore.getState().add(mockItem2, 'Main Canteen'); // Chai

    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes('/wallet')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ balance: 10.0, updatedAt: new Date().toISOString() }),
        });
      }
      if (url.includes('/predict/eta-preview')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ estimatedPrepSeconds: 420 }),
        });
      }
      if (url.includes('/orders') && init?.method === 'POST') {
        // Return 409 ITEM_UNAVAILABLE for Samosa
        return Promise.resolve({
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: 'ITEM_UNAVAILABLE',
              message: 'Samosa (2 pc) just sold out. Please remove it to proceed.',
              details: { menuItemId: 'item_samosa' },
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    vi.stubGlobal('fetch', mockFetch);

    renderWithProviders(<CheckoutPage />);

    const ctaButton = await screen.findByRole('button', { name: /Pay .* & Place Order/i });
    fireEvent.click(ctaButton);

    // Error banner should appear
    await waitFor(() => {
      expect(screen.getByText('Item Sold Out')).toBeInTheDocument();
      expect(
        screen.getByText(/Samosa \(2 pc\) just sold out/i)
      ).toBeInTheDocument();
    });

    // Remove & Continue action
    const removeBtn = screen.getByRole('button', { name: /Remove & Continue/i });
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);

    // Samosa should be removed from cart, only Chai remains
    expect(useCartStore.getState().lines['item_samosa']).toBeUndefined();
    expect(useCartStore.getState().lines['item_chai']).toBeDefined();
    expect(screen.queryByText('Item Sold Out')).not.toBeInTheDocument();
  });
});
