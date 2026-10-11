import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

export const notFound: RequestHandler = (_req, _res, next) => next(new AppError('NOT_FOUND', 'Route not found'));

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let status = 500;
  let body: { code: string; message: string; details?: unknown } = { code: 'INTERNAL', message: 'Internal server error' };

  if (err instanceof AppError) {
    status = err.status;
    body = { code: err.code, message: err.message, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    body = { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.issues };
  } else if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    status = 409;
    body = { code: 'CONFLICT', message: 'Duplicate record', details: err.meta };
  } else {
    logger.error({ err, requestId: req.id }, 'unhandled error');
  }
  res.status(status).json({ error: { ...body, requestId: req.id } });
};
