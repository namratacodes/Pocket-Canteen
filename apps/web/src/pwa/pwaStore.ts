import { create } from 'zustand';

// Chrome/Edge/Android fire this before offering "Install app". Not in the TS DOM types.
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  /** A new version is downloaded and waiting. */
  needRefresh: boolean;
  /** True while the student is in checkout (Razorpay open). The update toast waits. */
  checkoutActive: boolean;
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  setNeedRefresh: (v: boolean) => void;
  setCheckoutActive: (v: boolean) => void;
  setInstallEvent: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (v: boolean) => void;
}

export const usePwa = create<PwaState>((set) => ({
  needRefresh: false,
  checkoutActive: false,
  installEvent: null,
  installed: false,
  setNeedRefresh: (needRefresh) => set({ needRefresh }),
  setCheckoutActive: (checkoutActive) => set({ checkoutActive }),
  setInstallEvent: (installEvent) => set({ installEvent }),
  setInstalled: (installed) => set({ installed }),
}));

/** Call with true when checkout/Razorpay opens and false when it closes. */
export const setCheckoutActive = (active: boolean): void => usePwa.getState().setCheckoutActive(active);

/** True when the app was launched from the home screen icon. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad (iPadOS pretends to be a Mac, so check for touch). iOS has no install event. */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}