import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { randomToken } from '../../lib/crypto';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { isWithinHours } from '../../lib/time';
import type { CanteenDTO } from './types';
import { toUserDTO } from './types';

const router = Router();

const operatingHoursSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM format required'),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM format required'),
});

const paymentAccountSchema = z.object({
  razorpayAccountRef: z.string().min(1).max(100),
  bankAccountLast4: z.string().regex(/^\d{4}$/, 'Must be 4 digits'),
});

function formatCanteenResponse(
  canteen: {
    id: string;
    name: string;
    location: string;
    tokenPrefix: string;
    isOpen: boolean;
    operatingHours: any;
  },
  paymentAccount: {
    razorpayAccountRef: string;
    bankAccountLast4: string;
    kycStatus: string;
  } | null,
): CanteenDTO & { paymentAccount: { razorpayAccountRef: string; bankAccountLast4: string; kycStatus: string } | null } {
  const operatingHours = canteen.operatingHours as { open: string; close: string };
  const openNow = canteen.isOpen && isWithinHours(operatingHours);

  return {
    id: canteen.id,
    name: canteen.name,
    location: canteen.location,
    tokenPrefix: canteen.tokenPrefix,
    isOpen: canteen.isOpen,
    openNow,
    operatingHours,
    paymentAccount: paymentAccount
      ? {
          razorpayAccountRef: paymentAccount.razorpayAccountRef,
          bankAccountLast4: paymentAccount.bankAccountLast4,
          kycStatus: paymentAccount.kycStatus,
        }
      : null,
  };
}

// POST /admin/canteens
router.post(
  '/admin/canteens',
  authenticate,
  requireAdmin,
  validate({
    body: z
      .object({
        name: z.string().min(1).max(100),
        location: z.string().min(1).max(200),
        tokenPrefix: z.string().regex(/^[A-Z]$/, 'tokenPrefix must be a single uppercase letter A-Z'),
        fssaiLicenseNo: z.string().min(1).max(50),
        operatingHours: operatingHoursSchema,
        paymentAccount: paymentAccountSchema,
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const { name, location, tokenPrefix, fssaiLicenseNo, operatingHours, paymentAccount } = req.body;

    const existing = await prisma.canteen.findUnique({
      where: { tokenPrefix },
    });

    if (existing) {
      throw new AppError('CONFLICT', `Token prefix '${tokenPrefix}' is already in use`);
    }

    const { canteen, account } = await prisma.$transaction(async (tx) => {
      const createdCanteen = await tx.canteen.create({
        data: {
          name,
          location,
          tokenPrefix,
          fssaiLicenseNo,
          operatingHours,
          isOpen: true,
        },
      });

      const createdAccount = await tx.canteenPaymentAccount.create({
        data: {
          canteenId: createdCanteen.id,
          razorpayAccountRef: paymentAccount.razorpayAccountRef,
          bankAccountLast4: paymentAccount.bankAccountLast4,
          kycStatus: 'verified',
          isActive: true,
        },
      });

      return { canteen: createdCanteen, account: createdAccount };
    });

    res.status(201).json({
      data: formatCanteenResponse(canteen, account),
    });
  }),
);

// PATCH /admin/canteens/:id
router.patch(
  '/admin/canteens/:id',
  authenticate,
  requireAdmin,
  validate({
    params: z
      .object({
        id: z.string().uuid(),
      })
      .strict(),
    body: z
      .object({
        name: z.string().min(1).max(100).optional(),
        location: z.string().min(1).max(200).optional(),
        fssaiLicenseNo: z.string().min(1).max(50).optional(),
        operatingHours: operatingHoursSchema.optional(),
        paymentAccount: paymentAccountSchema.optional(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const { id } = req.params;
    const { name, location, fssaiLicenseNo, operatingHours, paymentAccount } = req.body;

    const canteen = await prisma.canteen.findUnique({
      where: { id },
    });

    if (!canteen) {
      throw new AppError('NOT_FOUND', 'Canteen not found');
    }

    const { updatedCanteen, activeAccount } = await prisma.$transaction(async (tx) => {
      const updated = await tx.canteen.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(location !== undefined ? { location } : {}),
          ...(fssaiLicenseNo !== undefined ? { fssaiLicenseNo } : {}),
          ...(operatingHours !== undefined ? { operatingHours } : {}),
        },
      });

      let acct: { razorpayAccountRef: string; bankAccountLast4: string; kycStatus: string } | null = null;

      if (paymentAccount) {
        // Deactivate currently active payment accounts
        await tx.canteenPaymentAccount.updateMany({
          where: { canteenId: id, isActive: true },
          data: { isActive: false },
        });

        // Create new active payment account
        acct = await tx.canteenPaymentAccount.create({
          data: {
            canteenId: id,
            razorpayAccountRef: paymentAccount.razorpayAccountRef,
            bankAccountLast4: paymentAccount.bankAccountLast4,
            kycStatus: 'verified',
            isActive: true,
          },
        });
      } else {
        acct = await tx.canteenPaymentAccount.findFirst({
          where: { canteenId: id, isActive: true },
        });
      }

      return { updatedCanteen: updated, activeAccount: acct };
    });

    res.status(200).json({
      data: formatCanteenResponse(updatedCanteen, activeAccount),
    });
  }),
);

// POST /admin/canteens/:id/staff
router.post(
  '/admin/canteens/:id/staff',
  authenticate,
  requireAdmin,
  validate({
    params: z
      .object({
        id: z.string().uuid(),
      })
      .strict(),
    body: z
      .object({
        name: z.string().min(1).max(100),
        email: z.string().trim().toLowerCase().email(),
        phone: z.string().regex(/^\+?[0-9]{10,15}$/, 'Invalid phone number').optional(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const canteen = await prisma.canteen.findUnique({
      where: { id },
    });

    if (!canteen) {
      throw new AppError('NOT_FOUND', 'Canteen not found');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('CONFLICT', 'Email already registered');
    }

    const temporaryPassword = randomToken(9);
    const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: 'staff',
        canteenId: id,
        passwordHash,
      },
    });

    res.status(201).json({
      data: {
        user: toUserDTO(user),
        temporaryPassword,
      },
    });
  }),
);

// PATCH /admin/users/:id/active
router.patch(
  '/admin/users/:id/active',
  authenticate,
  requireAdmin,
  validate({
    params: z
      .object({
        id: z.string().uuid(),
      })
      .strict(),
    body: z
      .object({
        isActive: z.boolean(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }

    // An admin cannot deactivate themselves
    if (req.user!.id === id && !isActive) {
      throw new AppError('CONFLICT', 'Admin cannot deactivate themselves');
    }

    const updatedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { isActive },
      });

      if (!isActive) {
        // Revoke all refresh tokens for this user
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return updated;
    });

    res.status(200).json({
      data: toUserDTO(updatedUser),
    });
  }),
);

export default router;
