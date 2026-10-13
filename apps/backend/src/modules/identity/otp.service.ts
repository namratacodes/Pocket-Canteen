import { env } from '../../config/env';
import { hmacHex, randomDigits, safeEqual } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { getOtpSender, type OtpSender } from './mailer';
import type { UserDTO } from './types';
import { toUserDTO } from './types';

export class OtpService {
  constructor(private otpSender: OtpSender = getOtpSender()) {}

  async requestOtp(emailRaw: string): Promise<{ sent: boolean }> {
    const email = emailRaw.trim().toLowerCase();

    // 1. Check allowed email domains if configured
    if (env.ALLOWED_EMAIL_DOMAINS) {
      const allowedDomains = env.ALLOWED_EMAIL_DOMAINS.split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      if (allowedDomains.length > 0) {
        const domain = email.split('@')[1] ?? '';
        if (!allowedDomains.includes(domain)) {
          throw new AppError('EMAIL_DOMAIN_NOT_ALLOWED', 'Email domain not allowed');
        }
      }
    }

    // 2. Rate limit: at most 3 challenges per email per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentCount = await prisma.otpChallenge.count({
      where: {
        email,
        createdAt: { gte: tenMinutesAgo },
      },
    });

    if (recentCount >= 3) {
      throw new AppError('RATE_LIMITED', 'Too many OTP requests. Please wait before trying again.');
    }

    // 3. Generate 6-digit code and store HMAC
    const code = randomDigits(6);
    const codeHash = hmacHex(env.JWT_ACCESS_SECRET, `otp:${email}:${code}`);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpChallenge.create({
      data: {
        email,
        codeHash,
        expiresAt,
        attempts: 0,
      },
    });

    // 4. Send through OtpSender
    await this.otpSender.sendOtp(email, code);

    return { sent: true };
  }

  async verifyOtp(emailRaw: string, code: string): Promise<{ user: UserDTO; isNewUser: boolean }> {
    const email = emailRaw.trim().toLowerCase();
    const now = new Date();

    // 1. Load the newest challenge for the email with consumedAt = null
    const challenge = await prisma.otpChallenge.findFirst({
      where: { email, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new AppError('OTP_INVALID', 'Invalid OTP');
    }

    if (challenge.expiresAt < now) {
      throw new AppError('OTP_EXPIRED', 'OTP expired');
    }

    // 2. Atomically bump attempts
    const updateAttempts = await prisma.otpChallenge.updateMany({
      where: {
        id: challenge.id,
        attempts: { lt: 5 },
      },
      data: {
        attempts: { increment: 1 },
      },
    });

    if (updateAttempts.count === 0) {
      throw new AppError('OTP_LOCKED', 'Too many failed attempts. Please request a new OTP.');
    }

    // 3. Compare HMAC of submitted code
    const expectedHash = hmacHex(env.JWT_ACCESS_SECRET, `otp:${email}:${code}`);
    if (!safeEqual(challenge.codeHash, expectedHash)) {
      const attemptsLeft = Math.max(0, 5 - (challenge.attempts + 1));
      throw new AppError('OTP_INVALID', 'Invalid OTP', { attemptsLeft });
    }

    // 4. Mark consumed atomically
    const markConsumed = await prisma.otpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: now },
    });

    if (markConsumed.count === 0) {
      throw new AppError('OTP_INVALID', 'OTP already consumed');
    }

    // 5. Find or create user
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== 'student') {
        throw new AppError('FORBIDDEN', 'Staff and admin must log in with password');
      }
      if (!existing.isActive) {
        throw new AppError('ACCOUNT_DISABLED', 'Account is disabled');
      }
      return { user: toUserDTO(existing), isNewUser: false };
    }

    // If new user, create student user + wallet row in a single transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: email.split('@')[0],
          email,
          role: 'student',
        },
      });

      await tx.wallet.create({
        data: {
          userId: created.id,
          balance: 0,
        },
      });

      return created;
    });

    return { user: toUserDTO(newUser), isNewUser: true };
  }
}

export const otpService = new OtpService();
