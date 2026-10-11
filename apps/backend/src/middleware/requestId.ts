import crypto from 'crypto';
import type { RequestHandler } from 'express';

export const requestId: RequestHandler = (req, res, next) => {
  req.id = (req.header('x-request-id') as string) || `req_${crypto.randomBytes(6).toString('hex')}`;
  res.setHeader('X-Request-Id', req.id);
  next();
};
