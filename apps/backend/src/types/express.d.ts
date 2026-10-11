import type { AuthUser } from '../lib/jwt';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: AuthUser;
      canteenId?: string; // set by requireStaff, always taken from the JWT
    }
  }
}
export {};
