import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Prefs {
  soundOn: boolean;
  nagMode: boolean;
  density: 'comfortable' | 'compact';
  fontScale: number;
  volume: number;
  set: (p: Partial<Omit<Prefs, 'set'>>) => void;
}

export const useKitchenPrefs = create<Prefs>()(
  persist(
    (set) => ({
      soundOn: true,
      nagMode: true,
      density: 'comfortable',
      fontScale: 1,
      volume: 0.8,
      set: (p) => set(p),
    }),
    { name: 'pc-kitchen-prefs-v1' },
  ),
);