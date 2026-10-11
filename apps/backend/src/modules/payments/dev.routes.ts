import { Router } from 'express';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { toPaise } from '../../lib/money';
import { prisma } from '../../lib/prisma';
import { wrap } from '../../middleware/asyncHandler';
import { fakeGateway } from './fake.gateway';
import { handleWebhook } from './webhook.controller';

/** Fake-gateway simulator. Only mounted outside production AND when PAYMENT_GATEWAY=fake. */
export const devEnabled = () => process.env.NODE_ENV !== 'production' && env.PAYMENT_GATEWAY === 'fake';

const router = Router();

router.post(
  '/dev/payments/:gatewayOrderId/capture',
  wrap(async (req, res) => {
    const attempt = await prisma.paymentAttempt.findUnique({ where: { razorpayOrderId: req.params.gatewayOrderId } });
    if (!attempt) throw new AppError('NOT_FOUND');
    const { rawBody, signature } = fakeGateway.simulateCapture(attempt.razorpayOrderId, toPaise(attempt.amount));
    const status = await handleWebhook(rawBody, signature);
    if (status !== 200) throw new AppError('INTERNAL', 'Simulated webhook failed');
    res.json({ data: { ok: true } });
  }),
);

export default router;
