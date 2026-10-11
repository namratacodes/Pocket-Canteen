import crypto from 'crypto';
import { env } from '../config/env';

export const hmacHex = (secret: string, msg: string | Buffer): string =>
  crypto.createHmac('sha256', secret).update(msg).digest('hex');

export const sha256Hex = (msg: string): string => crypto.createHash('sha256').update(msg).digest('hex');

export const randomToken = (bytes = 32): string => crypto.randomBytes(bytes).toString('base64url');

export const randomDigits = (n: number): string =>
  Array.from({ length: n }, () => crypto.randomInt(0, 10)).join('');

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

/** 4-digit pickup code in [1000, 9999]. Never stored. Recomputed from (orderId, pickupSalt). */
export function derivePickupCode(orderId: string, pickupSalt: string): string {
  const mac = crypto.createHmac('sha256', env.PICKUP_SECRET).update(`${orderId}:${pickupSalt}`).digest();
  return String(1000 + (mac.readUInt32BE(0) % 9000));
}
