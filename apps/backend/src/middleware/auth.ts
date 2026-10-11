import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../lib/jwt';

/** Requires 'Authorization: Bearer <accessJwt>'. Sets req.user. Does not hit the DB. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const h = req.header('authorization') ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return next(new AppError('UNAUTHORIZED', 'Missing bearer token'));
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (e) {
    next(e);
  }
};
