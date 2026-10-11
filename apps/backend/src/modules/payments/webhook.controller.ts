import type { Request, Response } from 'express';
import { sha256Hex } from '../../lib/crypto';
import { logger } from '../../lib/logger';
import { runTx } from '../../lib/tx';
import { getGateway } from './gateway';
import { markPaid } from './payment.service';

/** Shared by the real webhook route and the dev simulator. Returns the HTTP status to send. Throws on unexpected errors (-> 500). */
export async function handleWebhook(rawBody: Buffer, signature: string, eventIdHeader?: string): Promise<number> {
  if (!getGateway().verifyWebhookSignature(rawBody, signature)) {
    logger.warn('webhook rejected: bad signature');
    return 400;
  }
  let evt: any;
  try {
    evt = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return 400;
  }
  const eventId = eventIdHeader || sha256Hex(rawBody.toString('utf8'));
  const type = String(evt?.event ?? 'unknown').slice(0, 60);

  await runTx(async (ctx) => {
    const inserted = await ctx.tx.$executeRaw`INSERT INTO webhook_events (event_id, event_type) VALUES (${eventId}, ${type}) ON CONFLICT (event_id) DO NOTHING`;
    if (inserted === 0) return; // duplicate delivery

    const entity = evt?.payload?.payment?.entity;
    if ((type === 'payment.captured' || type === 'order.paid') && entity?.order_id) {
      await markPaid(ctx, { gatewayOrderId: String(entity.order_id), paymentId: String(entity.id), amountPaise: Number(entity.amount) });
    } else if (type === 'payment.failed' && entity?.order_id) {
      await ctx.tx.paymentAttempt.updateMany({ where: { razorpayOrderId: String(entity.order_id), status: 'created' }, data: { status: 'failed' } });
    }
    await ctx.tx.$executeRaw`UPDATE webhook_events SET processed_at = now() WHERE event_id = ${eventId}`;
  });
  return 200;
}

export async function webhookHandler(req: Request, res: Response) {
  if (!Buffer.isBuffer(req.body)) return void res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Expected raw JSON body', requestId: req.id } });
  const status = await handleWebhook(req.body, req.header('x-razorpay-signature') ?? '', req.header('x-razorpay-event-id') ?? undefined);
  if (status === 200) return void res.status(200).json({ data: { ok: true } });
  res.status(status).json({ error: { code: status === 400 ? 'PAYMENT_SIGNATURE_INVALID' : 'INTERNAL', message: 'Webhook rejected', requestId: req.id } });
}
