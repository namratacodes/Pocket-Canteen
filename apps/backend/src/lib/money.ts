import { Prisma } from '@prisma/client';

/** DB stores NUMERIC(10,2) rupees. Code and API use integer paise. Convert only at the DB boundary. */
export const toPaise = (v: Prisma.Decimal | string | number): number =>
  Math.round(new Prisma.Decimal(v).mul(100).toNumber());

export const fromPaise = (paise: number): Prisma.Decimal => new Prisma.Decimal(paise).div(100);
