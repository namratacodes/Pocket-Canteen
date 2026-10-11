import { logger } from '../lib/logger';
import type { KitchenOrderDTO } from '../types/dto';
import type { OrderStatus } from '@prisma/client';

/** Every socket event in the system. Names and payloads are a frozen contract. */
export interface EventMap {
  'order:new': KitchenOrderDTO; // room canteen:{id}
  'order:status_changed': {
    orderId: string;
    tokenNo: string;
    canteenId: string;
    from: OrderStatus | null;
    to: OrderStatus;
    at: string;
  }; // rooms canteen:{id} and user:{studentId}
  'order:ready': { orderId: string; tokenNo: string }; // room user:{studentId}
  'order:eta_updated': {
    orderId: string;
    predictedReadyAt: string;
    etaSeconds: number;
    source: 'ml' | 'fallback';
  }; // room user:{studentId}
  'order:pickup_locked': { orderId: string; tokenNo: string }; // rooms canteen:{id} and admins
  'menu:updated': { canteenId: string; itemId: string; changes: Record<string, unknown> }; // rooms menu:{id}, canteen:{id}
  'canteen:status_changed': { canteenId: string; isOpen: boolean }; // rooms menu:{id}, canteen:{id}
  'wallet:updated': { balancePaise: number }; // room user:{id}
}
export type EventName = keyof EventMap;

/** Rooms: canteen:{canteenId} (staff of that canteen), menu:{canteenId} (anyone subscribed),
 *  user:{userId} (that user), admins. Clients never choose rooms except menu:{id}. */
export interface RealtimeEmitter {
  toCanteen<E extends EventName>(canteenId: string, event: E, payload: EventMap[E]): void;
  toMenuRoom<E extends EventName>(canteenId: string, event: E, payload: EventMap[E]): void;
  toUser<E extends EventName>(userId: string, event: E, payload: EventMap[E]): void;
  toAdmins<E extends EventName>(event: E, payload: EventMap[E]): void;
}

export interface RecordedEmit {
  target: 'canteen' | 'menu' | 'user' | 'admins';
  id: string | null;
  event: EventName;
  payload: unknown;
}

/** Default implementation: records emits in memory (assert on them in tests). Phase 6 replaces it with Socket.io. */
export class RecordingEmitter implements RealtimeEmitter {
  calls: RecordedEmit[] = [];
  private rec(target: RecordedEmit['target'], id: string | null, event: EventName, payload: unknown) {
    logger.debug({ target, id, event }, 'realtime emit');
    this.calls.push({ target, id, event, payload });
    if (this.calls.length > 500) this.calls.shift();
  }
  toCanteen<E extends EventName>(id: string, e: E, p: EventMap[E]) { this.rec('canteen', id, e, p); }
  toMenuRoom<E extends EventName>(id: string, e: E, p: EventMap[E]) { this.rec('menu', id, e, p); }
  toUser<E extends EventName>(id: string, e: E, p: EventMap[E]) { this.rec('user', id, e, p); }
  toAdmins<E extends EventName>(e: E, p: EventMap[E]) { this.rec('admins', null, e, p); }
  clear() { this.calls = []; }
}

export const defaultRecorder = new RecordingEmitter();
let current: RealtimeEmitter = defaultRecorder;

export const setRealtimeImpl = (impl: RealtimeEmitter) => { current = impl; };

/** Import this everywhere you need to emit. Always call it from inside ctx.afterCommit(...) when in a transaction. */
export const realtime: RealtimeEmitter = {
  toCanteen: (...a) => current.toCanteen(...a),
  toMenuRoom: (...a) => current.toMenuRoom(...a),
  toUser: (...a) => current.toUser(...a),
  toAdmins: (...a) => current.toAdmins(...a),
};
