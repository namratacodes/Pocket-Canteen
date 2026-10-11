import type http from 'http';
import { Server } from 'socket.io';
import { env } from '../../config/env';
import { verifyAccessToken, type AuthUser } from '../../lib/jwt';
import { setRealtimeImpl, type EventMap, type EventName, type RealtimeEmitter } from '../../realtime/emitter';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v);

export class SocketEmitter implements RealtimeEmitter {
  constructor(private io: Server) {}
  toCanteen<E extends EventName>(id: string, event: E, payload: EventMap[E]) { this.io.to(`canteen:${id}`).emit(event, payload); }
  toMenuRoom<E extends EventName>(id: string, event: E, payload: EventMap[E]) { this.io.to(`menu:${id}`).emit(event, payload); }
  toUser<E extends EventName>(id: string, event: E, payload: EventMap[E]) { this.io.to(`user:${id}`).emit(event, payload); }
  toAdmins<E extends EventName>(event: E, payload: EventMap[E]) { this.io.to('admins').emit(event, payload); }
}

export function attachSocketServer(server: http.Server): Server {
  const io = new Server(server, { cors: { origin: env.CORS_ORIGINS.split(',').map((s) => s.trim()), credentials: true } });

  io.use((socket, next) => {
    try {
      socket.data.user = verifyAccessToken(String(socket.handshake.auth?.token ?? ''));
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.data.user as AuthUser;
    socket.join(`user:${u.id}`);
    if (u.role === 'staff' && u.canteenId) socket.join(`canteen:${u.canteenId}`); // from the JWT, never from the client
    if (u.role === 'admin') socket.join('admins');

    socket.on('subscribe:menu', (p: any, ack?: (r: { ok: boolean }) => void) => {
      if (isUuid(p?.canteenId)) { socket.join(`menu:${p.canteenId}`); ack?.({ ok: true }); } else ack?.({ ok: false });
    });
    socket.on('unsubscribe:menu', (p: any, ack?: (r: { ok: boolean }) => void) => {
      if (isUuid(p?.canteenId)) socket.leave(`menu:${p.canteenId}`);
      ack?.({ ok: true });
    });
  });

  setRealtimeImpl(new SocketEmitter(io));
  return io;
}
