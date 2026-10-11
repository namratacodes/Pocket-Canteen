import { AppError } from './errors';

export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64url');
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const [iso, id] = Buffer.from(cursor, 'base64url').toString().split('|');
    const createdAt = new Date(iso);
    if (!id || Number.isNaN(createdAt.getTime())) throw new Error('bad');
    return { createdAt, id };
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Invalid cursor');
  }
}

export const parseLimit = (v: unknown, def = 20, max = 100): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : def;
};
