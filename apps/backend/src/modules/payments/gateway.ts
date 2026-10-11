import { env } from '../../config/env';
import { FakeGateway, fakeGateway } from './fake.gateway';
import { RazorpayGateway } from './razorpay.gateway';

export interface GatewayPort {
  /** public key id returned to the client */
  keyId(): string;
  createOrder(p: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
    transferToAccountRef?: string;
  }): Promise<{ gatewayOrderId: string }>;
  verifyCheckoutSignature(p: { gatewayOrderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  listPayments(gatewayOrderId: string): Promise<{ paymentId: string; status: 'captured' | 'failed' | 'authorized' | 'created'; amountPaise: number }[]>;
}

let cached: GatewayPort | null = null;

/** Picked lazily on first use so tests can set the env first. */
export function getGateway(): GatewayPort {
  if (!cached) cached = env.PAYMENT_GATEWAY === 'razorpay' ? new RazorpayGateway() : fakeGateway;
  return cached;
}

export { FakeGateway, fakeGateway };
