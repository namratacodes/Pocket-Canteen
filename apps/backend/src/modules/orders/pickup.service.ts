import { derivePickupCode, safeEqual } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { lockOrder, runTx } from '../../lib/tx';
import { realtime } from '../../realtime/emitter';
import { toKitchenOrderDTO, loadLines } from './dto';
import { emitStatusChanged, transition } from './order.service';

export const MAX_PICKUP_ATTEMPTS = 5;

/** A wrong code RETURNS from the transaction (so the counter commits) and throws only afterwards. */
export async function verifyPickup(p: { orderId: string; canteenId: string; code: string; actorId: string }) {
  const outcome = await runTx(async (ctx) => {
    const o = await lockOrder(ctx.tx, p.orderId);
    if (!o || o.canteenId !== p.canteenId) throw new AppError('NOT_FOUND');
    if (o.status === 'cancelled') throw new AppError('ORDER_CANCELLED');
    if (o.status !== 'ready') throw new AppError('NOT_READY');
    if (o.pickupLockedAt) throw new AppError('PICKUP_LOCKED', undefined, { remainingAttempts: 0 });

    if (safeEqual(p.code, derivePickupCode(o.id, o.pickupSalt))) {
      const { before, after } = await transition(ctx, o.id, 'completed', p.actorId);
      emitStatusChanged(ctx, before, after, { toStudent: true });
      const lines = await loadLines(ctx.tx, [o.id]);
      return { ok: true as const, dto: toKitchenOrderDTO(after, lines.get(o.id) ?? []) };
    }

    const attempts = o.pickupAttempts + 1;
    const locked = attempts >= MAX_PICKUP_ATTEMPTS;
    await ctx.tx.order.update({ where: { id: o.id }, data: { pickupAttempts: attempts, pickupLockedAt: locked ? new Date() : null } });
    if (locked) {
      ctx.afterCommit(() => {
        realtime.toCanteen(o.canteenId, 'order:pickup_locked', { orderId: o.id, tokenNo: o.tokenNo });
        realtime.toAdmins('order:pickup_locked', { orderId: o.id, tokenNo: o.tokenNo });
      });
    }
    return { ok: false as const, remaining: Math.max(0, MAX_PICKUP_ATTEMPTS - attempts), locked };
  });

  if (!outcome.ok) {
    throw new AppError(outcome.locked ? 'PICKUP_LOCKED' : 'PICKUP_CODE_INVALID', undefined, { remainingAttempts: outcome.remaining });
  }
  return outcome.dto;
}

export async function unlockPickup(orderId: string) {
  await runTx(async (ctx) => {
    const o = await lockOrder(ctx.tx, orderId);
    if (!o) throw new AppError('NOT_FOUND');
    await ctx.tx.order.update({ where: { id: orderId }, data: { pickupAttempts: 0, pickupLockedAt: null } });
  });
  return { ok: true as const };
}
