import { Router } from 'express';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { isWithinHours } from '../../lib/time';
import type { CanteenDTO } from './types';

const router = Router();

router.get(
  '/canteens',
  authenticate,
  wrap(async (_req, res) => {
    const canteens = await prisma.canteen.findMany({
      orderBy: { tokenPrefix: 'asc' },
    });

    const data: CanteenDTO[] = canteens.map((c) => {
      const operatingHours = c.operatingHours as { open: string; close: string };
      const openNow = c.isOpen && isWithinHours(operatingHours);

      return {
        id: c.id,
        name: c.name,
        location: c.location,
        tokenPrefix: c.tokenPrefix,
        isOpen: c.isOpen,
        openNow,
        operatingHours,
      };
    });

    res.status(200).json({ data });
  }),
);

export default router;
