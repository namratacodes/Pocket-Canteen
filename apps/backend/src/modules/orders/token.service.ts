import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
import { campusDay } from '../../lib/time';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Runs inside the order transaction, so a rolled-back order leaves no gap. */
export async function nextTokenNo(tx: Prisma.TransactionClient, canteenId: string, tokenPrefix: string): Promise<string> {
  const rows = await tx.$queryRaw<{ last_token: number | bigint }[]>`
    INSERT INTO canteen_daily_counters (canteen_id, day, last_token)
    VALUES (${canteenId}::uuid, ${campusDay()}::date, 1)
    ON CONFLICT (canteen_id, day) DO UPDATE SET last_token = canteen_daily_counters.last_token + 1
    RETURNING last_token`;
  return `${tokenPrefix}-${Number(rows[0].last_token)}`;
}

export const makeOrderUid = (): string =>
  `PKT-${campusDay().replaceAll('-', '')}-${Array.from({ length: 4 }, () => ALPHABET[crypto.randomInt(0, ALPHABET.length)]).join('')}`;

/** Up to 5 tries to find an unused uid. The unique index is the final backstop. */
export async function uniqueOrderUid(tx: Prisma.TransactionClient): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const uid = makeOrderUid();
    if (!(await tx.order.findUnique({ where: { orderUid: uid }, select: { id: true } }))) return uid;
  }
  return makeOrderUid();
}
