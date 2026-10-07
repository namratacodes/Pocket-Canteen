import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/stores/authStore';
import { USER_CACHE, clearUserCaches, initPwa } from '@/pwa/initPwa';
import { isIos, isStandalone, setCheckoutActive, usePwa } from '@/pwa/pwaStore';

const student = { id: 'u1', name: 'S', phone: '+911', role: 'student' as const, canteenId: null };

describe('pwaStore', () => {
  afterEach(() => {
    usePwa.setState({ needRefresh: false, checkoutActive: false, installEvent: null, installed: false });
    vi.unstubAllGlobals();
  });

  it('tracks the checkout flag so the update toast can wait', () => {
    setCheckoutActive(true);
    expect(usePwa.getState().checkoutActive).toBe(true);
    setCheckoutActive(false);
    expect(usePwa.getState().checkoutActive).toBe(false);
  });

  it('detects iPhone and iPad, but not Android', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone', maxTouchPoints: 5 });
    expect(isIos()).toBe(true);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 5 }); // iPadOS
    expect(isIos()).toBe(true);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l', maxTouchPoints: 5 });
    expect(isIos()).toBe(false);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 0 }); // real Mac
    expect(isIos()).toBe(false);
  });

  it('detects the installed (standalone) app', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('standalone') }));
    expect(isStandalone()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(isStandalone()).toBe(false);
  });
});

describe('initPwa', () => {
  const del = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    del.mockClear();
    vi.stubGlobal('caches', { delete: del });
    useAuth.getState().clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('clearUserCaches deletes the per-user cache only', async () => {
    await clearUserCaches();
    expect(del).toHaveBeenCalledWith(USER_CACHE);
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('wipes cached orders and wallet when the user logs out', async () => {
    initPwa();
    useAuth.getState().setSession({ accessToken: 't', user: student });
    expect(del).not.toHaveBeenCalled(); // logging in keeps nothing to clear
    useAuth.getState().clear(); // logout / expired session
    await Promise.resolve();
    expect(del).toHaveBeenCalledWith(USER_CACHE);
  });

  it('captures the browser install event', () => {
    initPwa();
    const evt = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: vi.fn(), userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    });
    window.dispatchEvent(evt);
    expect(evt.defaultPrevented).toBe(true); // we hold it until the user taps Install
    expect(usePwa.getState().installEvent).toBe(evt);
    window.dispatchEvent(new Event('appinstalled'));
    expect(usePwa.getState().installEvent).toBeNull();
    expect(usePwa.getState().installed).toBe(true);
  });
});