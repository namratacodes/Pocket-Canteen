import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { parseLimit } from '../../lib/pagination';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { requireStudent } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { getStudentOrder, listStudentOrders, placeOrder, studentCancel } from './order.service';

const router = Router();
const auth = [authenticate, requireStudent];
const idParams = z.object({ id: z.string().uuid() });

const placeBody = z
  .object({
    canteenId: z.string().uuid(),
    items: z
      .array(z.object({ menuItemId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }).strict())
      .min(1)
      .max(20),
    useWallet: z.boolean().default(true),
  })
  .strict()
  .refine((b) => new Set(b.items.map((i) => i.menuItemId)).size === b.items.length, { message: 'Duplicate menuItemId', path: ['items'] });

router.post(
  '/orders',
  ...auth,
  rateLimit({ windowMs: 60_000, max: 10, key: (req) => `place:${req.user!.id}` }),
  validate({ body: placeBody }),
  wrap(async (req, res) => {
    const key = req.header('idempotency-key') ?? '';
    if (key.length < 8 || key.length > 64) throw new AppError('VALIDATION_ERROR', 'Idempotency-Key header (8-64 chars) is required');
    const r = await placeOrder({ studentId: req.user!.id, clientRequestId: key, ...req.body });
    res.status(r.created ? 201 : 200).json({ data: { order: r.order, payment: r.payment } });
  }),
);

router.get(
  '/orders',
  ...auth,
  wrap(async (req, res) => {
    const r = await listStudentOrders(req.user!.id, parseLimit(req.query.limit), typeof req.query.cursor === 'string' ? req.query.cursor : undefined);
    res.json(r);
  }),
);

router.get('/orders/:id', ...auth, validate({ params: idParams }), wrap(async (req, res) => {
  res.json({ data: await getStudentOrder(req.user!.id, req.params.id) });
}));

router.post('/orders/:id/cancel', ...auth, validate({ params: idParams }), wrap(async (req, res) => {
  res.json({ data: await studentCancel(req.user!.id, req.params.id) });
}));

export default router;
