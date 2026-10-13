import argon2 from 'argon2';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { tokensService } from './tokens.service';
import type { AuthResultDTO } from './types';
import { toUserDTO } from './types';

export class AuthService {
  async passwordLogin(emailRaw: string, password: string): Promise<AuthResultDTO> {
    const email = emailRaw.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role === 'student' || !user.passwordHash) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, password);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError('ACCOUNT_DISABLED', 'Account is disabled');
    }

    const tokens = await tokensService.issueTokens({
      id: user.id,
      role: user.role,
      canteenId: user.canteenId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toUserDTO(user),
    };
  }
}

export const authService = new AuthService();
