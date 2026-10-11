import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import type { Role } from '../lib/jwt';

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError('UNAUTHORIZED'));
    if (!roles.includes(req.user.role)) return next(new AppError('FORBIDDEN'));
    next();
  };

/** For /staff/* routes: role must be staff, and req.canteenId is taken ONLY from the JWT, never from body, query or params. */
export const requireStaff: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new AppError('UNAUTHORIZED'));
  if (req.user.role !== 'staff' || !req.user.canteenId) return next(new AppError('FORBIDDEN'));
  req.canteenId = req.user.canteenId;
  next();
};

export const requireStudent = requireRole('student');
export const requireAdmin = requireRole('admin');
