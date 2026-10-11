import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { prisma } from '../../lib/prisma';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { queueStats } from './eta/queueStats';

const router = Router();

router.get(
  '/canteens/:id/queue',
  authenticate,
  validate({ params: z.object({ id: z.string().uuid() }) }),
  wrap(async (req, res) => {
    const canteen = await prisma.canteen.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!canteen) throw new AppError('NOT_FOUND');
    const { depth, strain } = await queueStats(canteen.id);
    res.json({ data: { canteenId: canteen.id, queueDepth: depth, strainSeconds: Math.round(strain), estimatedWaitSeconds: 180 + 120 * depth } });
  }),
);

export default router;
