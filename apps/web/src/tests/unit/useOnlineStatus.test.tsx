import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useIsOnline } from '@/lib/network/useOnlineStatus';
import { useLastSynced } from '@/lib/network/useLastSynced';

let online = true;
Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });

const goOffline = () => act(() => { online = false; window.dispatchEvent(new Event('offline')); });
const goOnline = () => act(() => { online = true; window.dispatchEvent(new Event('online')); });

describe('useIsOnline', () => {
  afterEach(() => { online = true; });

  it('follows the browser online/offline events', () => {
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
    goOffline();
    expect(result.current).toBe(false);
    goOnline();
    expect(result.current).toBe(true);
  });
});

describe('useLastSynced', () => {
  afterEach(() => { online = true; localStorage.clear(); });

  it('is null while online, and returns the last fresh time once offline', () => {
    const { result } = renderHook(() => useLastSynced('menu:c1', true));
    expect(result.current).toBeNull();
    goOffline();
    expect(typeof result.current).toBe('number');
    expect(Math.abs((result.current as number) - Date.now())).toBeLessThan(2000);
  });

  it('keeps showing the saved time after a reload while offline, and does not overwrite it', () => {
    localStorage.setItem('pc-last-sync:menu:c1', '1000');
    online = false;
    const { result } = renderHook(() => useLastSynced('menu:c1', true));
    expect(result.current).toBe(1000);
  });

  it('does nothing when there is no data to stamp', () => {
    renderHook(() => useLastSynced('menu:c2', false));
    expect(localStorage.getItem('pc-last-sync:menu:c2')).toBeNull();
  });

  it('does not loop when the component re-renders many times', () => {
    const { rerender } = renderHook(() => useLastSynced('canteens', true));
    for (let i = 0; i < 20; i++) rerender();
    expect(Number(localStorage.getItem('pc-last-sync:canteens'))).toBeGreaterThan(0);
  });
});