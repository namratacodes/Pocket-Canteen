import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/stores/authStore';
import { useConnection } from '@/stores/connectionStore';
import { queryClient } from '@/app/queryClient';
import { refreshToken } from '@/lib/api/client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types';
import { mockSocket } from '@/mocks/mockSocket';

const isMock = import.meta.env.VITE_USE_MOCKS === 'true';

export const realSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  import.meta.env.VITE_WS_URL || 'http://localhost:4000',
  {
    autoConnect: false,
    transports: ['websocket'],
    auth: (cb) => cb({ token: useAuth.getState().accessToken }),
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  }
);

const rooms = new Set<string>();

export const joinRoom = (r: string) => {
  rooms.add(r);
  if (isMock) {
    mockSocket.emit('room:join', { room: r });
  } else if (realSocket.connected) {
    realSocket.emit('room:join', { room: r });
  }
};

export const leaveRoom = (r: string) => {
  rooms.delete(r);
  if (isMock) {
    mockSocket.emit('room:leave', { room: r });
  } else if (realSocket.connected) {
    realSocket.emit('room:leave', { room: r });
  }
};

realSocket.on('connect', () => {
  rooms.forEach((r) => realSocket.emit('room:join', { room: r }));
  useConnection.getState().set('connected');
  queryClient.invalidateQueries();
});

realSocket.on('disconnect', () => {
  useConnection.getState().set('reconnecting');
});

realSocket.on('connect_error', async (err) => {
  if (err.message === 'unauthorized') {
    await refreshToken();
    realSocket.connect();
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useConnection.getState().set('connected');
    if (!isMock && !realSocket.connected) {
      realSocket.connect();
    }
  });

  window.addEventListener('offline', () => {
    useConnection.getState().set('offline');
  });
}

export const socket = isMock
  ? (mockSocket as unknown as Socket<ServerToClientEvents, ClientToServerEvents>)
  : realSocket;
