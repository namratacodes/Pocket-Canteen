import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { LastUpdatedNote } from '@/components/common/LastUpdatedNote';
import { PickupCodeFallback } from '@/features/student/orders/PickupCodeFallback';

let online = true;
Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
const setOnline = (v: boolean) =>
  act(() => { online = v; window.dispatchEvent(new Event(v ? 'online' : 'offline')); });

afterEach(() => { online = true; localStorage.clear(); });

describe('OfflineBanner', () => {
  it('shows only while offline, with wording per role', () => {
    render(<><OfflineBanner variant="student" /><OfflineBanner variant="kitchen" /></>);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
    setOnline(false);
    expect(screen.getByText("You're offline. Showing saved data.")).toBeInTheDocument();
    expect(screen.getByText(/showing the last known orders/i)).toBeInTheDocument();
    setOnline(true);
    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });

  it('keeps its live region mounted so screen readers announce it', () => {
    render(<OfflineBanner variant="admin" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('LastUpdatedNote', () => {
  it('shows "Last updated" with the saved time while offline', () => {
    localStorage.setItem('pc-last-sync:canteens', String(new Date('2026-10-07T07:11:00Z').getTime()));
    online = false;
    render(<LastUpdatedNote scope="canteens" hasData />);
    expect(screen.getByText(/offline\. last updated \d{1,2}:\d{2}/i)).toBeInTheDocument();
  });

  it('renders nothing while online', () => {
    const { container } = render(<LastUpdatedNote scope="canteens" hasData />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PickupCodeFallback', () => {
  it('shows the saved token and pickup code with no connection', () => {
    online = false;
    render(<PickupCodeFallback tokenNo="A-14" code="4821" onRetry={() => {}} />);
    expect(screen.getByText('A-14')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-code')).toHaveTextContent('4821');
    expect(screen.getByText(/saved on this phone/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument();
  });

  it('offers a retry once the device is back online', () => {
    online = false;
    const onRetry = vi.fn();
    render(<PickupCodeFallback tokenNo="A-14" code="4821" onRetry={onRetry} />);
    setOnline(true);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('pickup-code')).toHaveTextContent('4821');
  });
});