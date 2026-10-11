import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/errors';
import { toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { runTx } from '../../lib/tx';
import { wrap } from '../../middleware/asyncHandler';
import { authenticate } from '../../middleware/auth';
import { rateLimit } from '../../middleware/rateLimit';
import { requireStudent } from '../../middleware/rbac';
import { validate } from '../../middleware/validate';
import { getGateway } from './gateway';
import { markPaid } from './payment.service';

const router = Router();

router.post(
  '/orders/:id/pay/confirm',
  authenticate,
  requireStudent,
  rateLimit({ windowMs: 60_000, max: 20, key: (req) => `payconfirm:${req.user!.id}` }),
  validate({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({ razorpayOrderId: z.string().min(1), razorpayPaymentId: z.string().min(1), razorpaySignature: z.string().min(1) }).strict(),
  }),
  wrap(async (req, res) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const order = await prisma.order.findFirst({ where: { id: req.params.id, studentId: req.user!.id } });
    if (!order) throw new AppError('NOT_FOUND');
    const attempt = await prisma.paymentAttempt.findFirst({ where: { razorpayOrderId, orderId: order.id } });
    if (!attempt) throw new AppError('NOT_FOUND');
    if (!getGateway().verifyCheckoutSignature({ gatewayOrderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })) {
      throw new AppError('PAYMENT_SIGNATURE_INVALID');
    }
    await runTx((ctx) => markPaid(ctx, { gatewayOrderId: razorpayOrderId, paymentId: razorpayPaymentId, amountPaise: toPaise(attempt.amount) }));
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { id: true, status: true } });
    res.json({ data: { orderId: fresh.id, status: fresh.status } });
  }),
);

export default router;
