import { Router } from 'express';
import { z } from 'zod';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { AppError } from '../../lib/errors';
import { toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { toUserDTO } from './types';

const router = Router();

router.get(
  '/me',
  authenticate,
  wrap(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }

    let walletBalancePaise: number | null = null;
    if (user.role === 'student') {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
      });
      walletBalancePaise = wallet ? toPaise(wallet.balance) : 0;
    }

    res.status(200).json({
      data: {
        ...toUserDTO(user),
        walletBalancePaise,
      },
    });
  }),
);

router.patch(
  '/me',
  authenticate,
  validate({
    body: z
      .object({
        name: z.string().min(1).max(100).optional(),
        phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10-15 digits').optional(),
      })
      .strict()
      .refine((data) => data.name !== undefined || data.phone !== undefined, {
        message: 'At least one field (name, phone) must be provided',
      }),
  }),
  wrap(async (req, res) => {
    if (req.body.phone) {
      const existing = await prisma.user.findFirst({
        where: {
          phone: req.body.phone,
          NOT: { id: req.user!.id },
        },
      });

      if (existing) {
        throw new AppError('CONFLICT', 'Phone number already registered');
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(req.body.name !== undefined ? { name: req.body.name } : {}),
        ...(req.body.phone !== undefined ? { phone: req.body.phone } : {}),
      },
    });

    res.status(200).json({
      data: toUserDTO(updated),
    });
  }),
);

export default router;
