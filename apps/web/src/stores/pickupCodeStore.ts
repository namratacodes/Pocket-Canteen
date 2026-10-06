import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface StoredPickupCode {
  code: string;
  tokenNo: string;
  savedAt: number;
}

export interface PickupCodeState {
  codes: Record<string, StoredPickupCode>;
  save: (orderId: string, data: { code: string; tokenNo: string; savedAt?: number }) => void;
  getCode: (orderId: string) => StoredPickupCode | null;
  remove: (orderId: string) => void;
  clear: () => void;
  purgeExpired: () => void;
}

export const usePickupCodeStore = create<PickupCodeState>()(
  persist(
    (set, get) => ({
      codes: {},

      save: (orderId, { code, tokenNo, savedAt }) => {
        const now = Date.now();
        const current = get().codes;
        // Purge expired while saving
        const cleaned: Record<string, StoredPickupCode> = {};
        for (const [id, item] of Object.entries(current)) {
          if (now - item.savedAt < ONE_DAY_MS) {
            cleaned[id] = item;
          }
        }

        cleaned[orderId] = {
          code,
          tokenNo,
          savedAt: savedAt ?? now,
        };

        set({ codes: cleaned });
      },

      getCode: (orderId) => {
        const item = get().codes[orderId];
        if (!item) return null;
        if (Date.now() - item.savedAt >= ONE_DAY_MS) {
          get().remove(orderId);
          return null;
        }
        return item;
      },

      remove: (orderId) => {
        const next = { ...get().codes };
        delete next[orderId];
        set({ codes: next });
      },

      clear: () => {
        set({ codes: {} });
      },

      purgeExpired: () => {
        const now = Date.now();
        const current = get().codes;
        const cleaned: Record<string, StoredPickupCode> = {};
        let changed = false;

        for (const [id, item] of Object.entries(current)) {
          if (now - item.savedAt < ONE_DAY_MS) {
            cleaned[id] = item;
          } else {
            changed = true;
          }
        }

        if (changed) {
          set({ codes: cleaned });
        }
      },
    }),
    {
      name: 'pc-pickup-codes-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
