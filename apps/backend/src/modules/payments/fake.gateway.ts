import crypto from 'crypto';
import { hmacHex, randomToken, safeEqual } from '../../lib/crypto';
import type { GatewayPort } from './gateway';

export const FAKE_KEY_SECRET = 'fake_key_secret';
export const FAKE_WEBHOOK_SECRET = 'fake_webhook_secret';

/** Default gateway for dev, demos and tests. Same signature algorithms as Razorpay. */
export class FakeGateway implements GatewayPort {
  captures = new Map<string, { paymentId: string; amountPaise: number }>();

  keyId() { return 'rzp_test_fake'; }

  async createOrder(_p: { amountPaise: number; receipt: string; notes: Record<string, string>; transferToAccountRef?: string }) {
    return { gatewayOrderId: `order_fake_${randomToken(8)}` };
  }

  verifyCheckoutSignature(p: { gatewayOrderId: string; paymentId: string; signature: string }) {
    return safeEqual(this.signCheckout(p.gatewayOrderId, p.paymentId), p.signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string) {
    return safeEqual(hmacHex(FAKE_WEBHOOK_SECRET, rawBody), signature ?? '');
  }

  async listPayments(gatewayOrderId: string) {
    const c = this.captures.get(gatewayOrderId);
    return c ? [{ paymentId: c.paymentId, status: 'captured' as const, amountPaise: c.amountPaise }] : [];
  }

  /** Test/demo helper: checkout signature the client would send. */
  signCheckout(gatewayOrderId: string, paymentId: string) {
    return hmacHex(FAKE_KEY_SECRET, `${gatewayOrderId}|${paymentId}`);
  }

  /** Registers a capture and returns a signed Razorpay-shaped payment.captured webhook. */
  simulateCapture(gatewayOrderId: string, amountPaise: number) {
    const paymentId = `pay_fake_${crypto.randomBytes(6).toString('hex')}`;
    this.captures.set(gatewayOrderId, { paymentId, amountPaise });
    return { ...this.signedEvent('payment.captured', gatewayOrderId, paymentId, amountPaise), paymentId };
  }

  /** Signed webhook body for any event type (used by tests, e.g. payment.failed). */
  signedEvent(event: string, gatewayOrderId: string, paymentId: string, amountPaise: number) {
    const rawBody = Buffer.from(
      JSON.stringify({
        event,
        payload: { payment: { entity: { id: paymentId, order_id: gatewayOrderId, amount: amountPaise, currency: 'INR', status: event === 'payment.failed' ? 'failed' : 'captured' } } },
      }),
    );
    return { rawBody, signature: hmacHex(FAKE_WEBHOOK_SECRET, rawBody) };
  }

  reset() { this.captures.clear(); }
}

export const fakeGateway = new FakeGateway();
