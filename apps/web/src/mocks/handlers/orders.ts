import { http, HttpResponse } from 'msw';
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  Order,
  OrderLine,
} from '@/types';
import { mockCanteens } from './canteens';
import { mockMenuItems } from './menu';
import { mockWallet, setMockWalletBalance } from './wallet';

export const mockOrders = new Map<string, Order>();
let tokenIndex = 14;
let orderIndex = 42;

export const resetMockOrders = () => {
  mockOrders.clear();
  tokenIndex = 14;
  orderIndex = 42;
};

export const ordersHandlers = [
  // GET /api/v1/orders/:id
  http.get('/api/v1/orders/:id', ({ params }) => {
    const { id } = params as { id: string };
    const order = mockOrders.get(id);

    if (!order) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json(order);
  }),

  // POST /api/v1/orders
  http.post('/api/v1/orders', async ({ request }) => {
    const body = (await request.json().catch(() => null)) as CreateOrderRequest | null;

    if (!body || !body.canteenId || !body.items || body.items.length === 0) {
      return HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Invalid order request payload',
          },
        },
        { status: 400 }
      );
    }

    // 1. Verify Canteen
    const canteen = mockCanteens.find((c) => c.id === body.canteenId);
    if (!canteen) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Canteen not found' } },
        { status: 404 }
      );
    }

    if (!canteen.isOpen) {
      return HttpResponse.json(
        {
          error: {
            code: 'CANTEEN_CLOSED',
            message: `${canteen.name} is currently closed. Opens at ${canteen.operatingHours.open}`,
          },
        },
        { status: 409 }
      );
    }

    // 2. Verify Menu Items & calculate total
    const menu = mockMenuItems[body.canteenId] || [];
    const orderLines: OrderLine[] = [];
    let totalAmount = 0;
    let maxPrepSecs = 180;

    for (const itemReq of body.items) {
      const menuItem = menu.find((m) => m.id === itemReq.menuItemId);
      if (!menuItem) {
        return HttpResponse.json(
          {
            error: {
              code: 'ITEM_UNAVAILABLE',
              message: 'An item is no longer on the menu',
              details: { menuItemId: itemReq.menuItemId },
            },
          },
          { status: 409 }
        );
      }

      if (!menuItem.isAvailable) {
        return HttpResponse.json(
          {
            error: {
              code: 'ITEM_UNAVAILABLE',
              message: `${menuItem.name} just sold out. Please remove it to proceed.`,
              details: { menuItemId: menuItem.id },
            },
          },
          { status: 409 }
        );
      }

      const lineTotal = +(menuItem.price * itemReq.quantity).toFixed(2);
      totalAmount = +(totalAmount + lineTotal).toFixed(2);
      maxPrepSecs = Math.max(maxPrepSecs, menuItem.basePrepSeconds || 180);

      orderLines.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: itemReq.quantity,
        priceAtOrderTime: menuItem.price,
      });
    }

    // 3. Wallet & Split-pay computation
    let walletAmountApplied = 0;
    if (body.useWallet) {
      walletAmountApplied = Math.min(mockWallet.balance, totalAmount);
      setMockWalletBalance(mockWallet.balance - walletAmountApplied);
    }

    const gatewayAmount = +(totalAmount - walletAmountApplied).toFixed(2);
    const orderId = `ord_${Date.now()}`;
    const tokenNo = `A-${tokenIndex++}`;
    const orderUid = `PKT-20261005-${String(orderIndex++).padStart(4, '0')}`;
    const estimatedPrepSeconds = Math.round(maxPrepSecs * 1.15 + (orderLines.length - 1) * 60);
    const targetPickupTime = new Date(Date.now() + estimatedPrepSeconds * 1000).toISOString();

    const order: Order = {
      id: orderId,
      orderUid,
      tokenNo,
      canteenId: canteen.id,
      canteenName: canteen.name,
      status: 'placed',
      paymentStatus: gatewayAmount === 0 ? 'paid' : 'pending',
      items: orderLines,
      totalAmount,
      walletAmountApplied,
      gatewayAmount,
      estimatedPrepSeconds,
      targetPickupTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockOrders.set(orderId, order);

    // 4. Generate 4-digit pickup code
    const pickupCode = String(Math.floor(1000 + Math.random() * 9000));

    const response: CreateOrderResponse = {
      order,
      pickupCode,
      ...(gatewayAmount > 0
        ? {
            razorpay: {
              orderId: `rzp_order_${orderId}`,
              amount: Math.round(gatewayAmount * 100), // paise
              currency: 'INR',
              keyId: 'rzp_test_campus123',
            },
          }
        : {}),
    };

    return HttpResponse.json(response);
  }),

  // POST /api/v1/payments/verify
  http.post('/api/v1/payments/verify', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as {
      orderId?: string;
      razorpay_payment_id?: string;
      razorpay_order_id?: string;
      razorpay_signature?: string;
    };

    if (body.orderId && mockOrders.has(body.orderId)) {
      const order = mockOrders.get(body.orderId)!;
      order.paymentStatus = 'paid';
      order.updatedAt = new Date().toISOString();
      mockOrders.set(body.orderId, order);
    }

    return HttpResponse.json({ paymentStatus: 'paid' });
  }),

  // POST /api/v1/orders/:id/payment/retry
  http.post('/api/v1/orders/:id/payment/retry', ({ params }) => {
    const { id } = params as { id: string };
    const order = mockOrders.get(id);

    if (!order) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Order not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      razorpay: {
        orderId: `rzp_retry_${order.id}_${Date.now()}`,
        amount: Math.round(order.gatewayAmount * 100),
        currency: 'INR',
        keyId: 'rzp_test_campus123',
      },
    });
  }),
];
