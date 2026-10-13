import { env } from '../../config/env';
import { randomToken, sha256Hex } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { signAccessToken } from '../../lib/jwt';
import { prisma } from '../../lib/prisma';
import type { UserDTO } from './types';
import { toUserDTO } from './types';

export class TokensService {
  async issueTokens(user: { id: string; role: 'student' | 'staff' | 'admin'; canteenId: string | null }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = signAccessToken({
      id: user.id,
      role: user.role,
      canteenId: user.canteenId,
    });

    const token = randomToken(48);
    const tokenHash = sha256Hex(token);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return { accessToken, refreshToken: token };
  }

  async rotateRefreshToken(token: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserDTO;
  }> {
    const tokenHash = sha256Hex(token);
    const row = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!row) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token');
    }

    // 2. Found but revokedAt set -> reuse detected! Revoke every token of that user.
    if (row.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError('UNAUTHORIZED', 'Refresh token reused');
    }

    // 3. Expired check
    if (row.expiresAt < new Date()) {
      throw new AppError('UNAUTHORIZED', 'Refresh token expired');
    }

    // User check
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found');
    }

    if (!user.isActive) {
      throw new AppError('ACCOUNT_DISABLED', 'Account is disabled');
    }

    // 4. In one transaction revoke the old row and create a new one
    const newToken = randomToken(48);
    const newTokenHash = sha256Hex(newToken);
    const newExpiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({
        where: { id: row.id },
        data: { revokedAt: now },
      });

      await tx.refreshToken.create({
        data: {
          userId: user.id,
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
        },
      });
    });

    const accessToken = signAccessToken({
      id: user.id,
      role: user.role,
      canteenId: user.canteenId,
    });

    return {
      accessToken,
      refreshToken: newToken,
      user: toUserDTO(user),
    };
  }

  async revokeRefreshToken(token: string): Promise<{ ok: boolean }> {
    const tokenHash = sha256Hex(token);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }
}

export const tokensService = new TokensService();
