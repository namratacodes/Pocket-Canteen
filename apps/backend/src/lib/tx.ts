import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

export interface TxContext {
  tx: Prisma.TransactionClient;
  /** Runs only after the surrounding transaction COMMITS. Use for socket emits and other side effects. */
  afterCommit(cb: () => void | Promise<void>): void;
}

export async function runTx<T>(fn: (ctx: TxContext) => Promise<T>): Promise<T> {
  const callbacks: Array<() => void | Promise<void>> = [];
  const result = await prisma.$transaction(
    (tx) => fn({ tx, afterCommit: (cb) => void callbacks.push(cb) }),
    { maxWait: 5000, timeout: 15000 },
  );
  for (const cb of callbacks) {
    try {
      await cb();
    } catch (err) {
      logger.error({ err }, 'afterCommit callback failed');
    }
  }
  return result;
}

/** Row locks. Always lock in this order when you need several: order, then wallet. */
export async function lockOrder(tx: Prisma.TransactionClient, orderId: string) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
  return tx.order.findUnique({ where: { id: orderId } });
}

export async function lockWallet(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT user_id FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`;
  return tx.wallet.findUnique({ where: { userId } });
}
