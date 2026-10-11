import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { requireAdmin, requireStaff } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { kitchenAdvance, kitchenSnapshot, staffCancel } from './order.service';
import { unlockPickup, verifyPickup } from './pickup.service';

const router = Router();
const staff = [authenticate, requireStaff];
const idParams = z.object({ id: z.string().uuid() });
const BOARD = ['placed', 'preparing', 'ready'] as const;

router.get(
  '/staff/orders',
  ...staff,
  wrap(async (req, res) => {
    const raw = typeof req.query.status === 'string' ? req.query.status : BOARD.join(',');
    const parsed = z.array(z.enum(BOARD)).min(1).safeParse(raw.split(',').map((s) => s.trim()));
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'status must be a comma list of placed,preparing,ready');
    res.json({ data: await kitchenSnapshot(req.canteenId!, parsed.data) });
  }),
);

router.post('/staff/orders/:id/start', ...staff, validate({ params: idParams }), wrap(async (req, res) => {
  res.json({ data: await kitchenAdvance({ orderId: req.params.id, canteenId: req.canteenId!, actorId: req.user!.id, to: 'preparing' }) });
}));

router.post('/staff/orders/:id/ready', ...staff, validate({ params: idParams }), wrap(async (req, res) => {
  res.json({ data: await kitchenAdvance({ orderId: req.params.id, canteenId: req.canteenId!, actorId: req.user!.id, to: 'ready' }) });
}));

router.post(
  '/staff/orders/:id/cancel',
  ...staff,
  validate({ params: idParams, body: z.object({ reason: z.string().trim().min(3).max(200) }).strict() }),
  wrap(async (req, res) => {
    res.json({ data: await staffCancel({ orderId: req.params.id, canteenId: req.canteenId!, actorId: req.user!.id, reason: req.body.reason }) });
  }),
);

router.post(
  '/staff/orders/:id/verify-pickup',
  ...staff,
  rateLimit({ windowMs: 60_000, max: 30, key: (req) => `pickup:${req.user!.id}` }),
  validate({ params: idParams, body: z.object({ code: z.string().regex(/^\d{4}$/) }).strict() }),
  wrap(async (req, res) => {
    res.json({ data: await verifyPickup({ orderId: req.params.id, canteenId: req.canteenId!, code: req.body.code, actorId: req.user!.id }) });
  }),
);

router.post('/admin/orders/:id/unlock-pickup', authenticate, requireAdmin, validate({ params: idParams }), wrap(async (req, res) => {
  res.json({ data: await unlockPickup(req.params.id) });
}));

export default router;
