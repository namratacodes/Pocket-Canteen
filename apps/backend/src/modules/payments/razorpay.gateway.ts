import Razorpay from 'razorpay';
import { env } from '../../config/env';
import { hmacHex, safeEqual } from '../../lib/crypto';
import type { GatewayPort } from './gateway';

export class RazorpayGateway implements GatewayPort {
  private rz = new Razorpay({ key_id: env.RAZORPAY_KEY_ID ?? '', key_secret: env.RAZORPAY_KEY_SECRET ?? '' });

  keyId() { return env.RAZORPAY_KEY_ID ?? ''; }

  async createOrder(p: { amountPaise: number; receipt: string; notes: Record<string, string>; transferToAccountRef?: string }) {
    const body: Record<string, unknown> = { amount: p.amountPaise, currency: 'INR', receipt: p.receipt, notes: p.notes };
    // Route ("direct to canteen"). Verify the exact request format in Razorpay's current docs before enabling.
    if (env.RAZORPAY_ROUTE_ENABLED === 'true' && p.transferToAccountRef) {
      body.transfers = [{ account: p.transferToAccountRef, amount: p.amountPaise, currency: 'INR' }];
    }
    const o = await this.rz.orders.create(body as any);
    return { gatewayOrderId: o.id };
  }

  verifyCheckoutSignature(p: { gatewayOrderId: string; paymentId: string; signature: string }) {
    return safeEqual(hmacHex(env.RAZORPAY_KEY_SECRET ?? '', `${p.gatewayOrderId}|${p.paymentId}`), p.signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    return safeEqual(hmacHex(env.RAZORPAY_WEBHOOK_SECRET ?? '', rawBody), signature ?? '');
  }

  async listPayments(gatewayOrderId: string) {
    const r: any = await this.rz.orders.fetchPayments(gatewayOrderId);
    return (r.items ?? []).map((x: any) => ({ paymentId: x.id as string, status: x.status as 'captured' | 'failed' | 'authorized' | 'created', amountPaise: Number(x.amount) }));
  }
}
