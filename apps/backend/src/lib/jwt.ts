import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errors';

export type Role = 'student' | 'staff' | 'admin';
export interface AuthUser {
  id: string;
  role: Role;
  canteenId: string | null; // set only for staff
}

export function signAccessToken(u: AuthUser): string {
  return jwt.sign({ role: u.role, canteenId: u.canteenId }, env.JWT_ACCESS_SECRET, {
    subject: u.id,
    expiresIn: env.JWT_ACCESS_TTL as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): AuthUser {
  try {
    const p = jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    return { id: p.sub as string, role: p.role, canteenId: p.canteenId ?? null };
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired token');
  }
}
