import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

export async function cleanupExpired(): Promise<void> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const deletedOtps = await prisma.otpChallenge.deleteMany({
    where: {
      createdAt: { lt: oneDayAgo },
    },
  });

  const deletedTokens = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: oneDayAgo } },
        { revokedAt: { not: null, lt: oneDayAgo } },
      ],
    },
  });

  logger.info(
    { deletedOtps: deletedOtps.count, deletedTokens: deletedTokens.count },
    'identityCleanup job completed',
  );
}
