import type { Request, RequestHandler } from 'express';
import { env } from '../config/env';
import { AppError } from '../lib/errors';

/** In-memory sliding window (single instance). Disabled when NODE_ENV=test unless ENABLE_RATE_LIMIT=1. */
export function rateLimit(opts: {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
}): RequestHandler {
  const hits = new Map<string, number[]>();
  return (req, _res, next) => {
    if (env.NODE_ENV === 'test' && !process.env.ENABLE_RATE_LIMIT) return next();
    const k = opts.key(req);
    const now = Date.now();
    const arr = (hits.get(k) ?? []).filter((t) => now - t < opts.windowMs);
    if (arr.length >= opts.max) {
      hits.set(k, arr);
      return next(new AppError('RATE_LIMITED', 'Too many requests', { retryAfterMs: opts.windowMs - (now - arr[0]) }));
    }
    arr.push(now);
    hits.set(k, arr);
    next();
  };
}
