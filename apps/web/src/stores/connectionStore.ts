import { create } from 'zustand';

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

interface ConnectionState {
  status: ConnectionStatus;
  set: (status: ConnectionStatus) => void;
}

export const useConnection = create<ConnectionState>((set) => ({
  status: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'connected',
  set: (status: ConnectionStatus) => set({ status }),
}));

export const connectionStore = useConnection;
