import { Router } from 'express';
import { z } from 'zod';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { analyticsService } from './analytics.service';

const router = Router();

router.get(
  '/staff/analytics/summary',
  authenticate,
  requireStaff,
  validate({
    query: z
      .object({
        days: z.coerce.number().int().min(1).max(90).default(7),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const days = Number(req.query.days) || 7;
    const result = await analyticsService.getSummary(req.canteenId!, days);
    res.status(200).json({ data: result });
  }),
);

export default router;
