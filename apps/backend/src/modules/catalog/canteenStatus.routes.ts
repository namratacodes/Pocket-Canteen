import { Router } from 'express';
import { z } from 'zod';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { requireStaff } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { runTx } from '../../lib/tx';
import { realtime } from '../../realtime/emitter';

const router = Router();

router.patch(
  '/staff/canteen/open',
  authenticate,
  requireStaff,
  validate({
    body: z
      .object({
        isOpen: z.boolean(),
      })
      .strict(),
  }),
  wrap(async (req, res) => {
    const canteenId = req.canteenId!;
    const { isOpen } = req.body;

    await runTx(async (ctx) => {
      await ctx.tx.canteen.update({
        where: { id: canteenId },
        data: { isOpen },
      });

      ctx.afterCommit(() => {
        const payload = { canteenId, isOpen };
        realtime.toMenuRoom(canteenId, 'canteen:status_changed', payload);
        realtime.toCanteen(canteenId, 'canteen:status_changed', payload);
      });
    });

    res.status(200).json({
      data: { canteenId, isOpen },
    });
  }),
);

export default router;
