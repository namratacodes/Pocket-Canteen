import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

/** Replaceable in tests. */
export const deps = {
  checkDb: async () => { await prisma.$queryRaw`SELECT 1`; },
};

export const healthHandler = (_req: Request, res: Response) => { res.status(200).json({ status: 'ok' }); };

export async function readyHandler(_req: Request, res: Response) {
  try {
    await deps.checkDb();
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
}
