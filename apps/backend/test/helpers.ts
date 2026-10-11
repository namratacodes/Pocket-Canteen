import crypto from 'crypto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import request from 'supertest';
import { buildApp } from '../src/app';
import { container } from '../src/container';
import { signAccessToken } from '../src/lib/jwt';
import { fromPaise } from '../src/lib/money';
import { prisma } from '../src/lib/prisma';
import { defaultRecorder } from '../src/realtime/emitter';
import type { BackendModule } from '../src/modules/types';

const rid = () => crypto.randomBytes(4).toString('hex');

export async function resetDb() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE order_status_log, order_items, payment_attempts, wallet_ledger, orders, wallets,
      refresh_tokens, otp_challenges, webhook_events, menu_audit_log, menu_item_prep_metadata, menu_items,
      canteen_daily_counters, canteen_settlements, canteen_payment_accounts, users, canteens
    RESTART IDENTITY CASCADE`);
  container.reset();
  defaultRecorder.clear();
}

let prefixCounter = 0;
export async function makeCanteen(o: Partial<{ name: string; isOpen: boolean; hours: { open: string; close: string } }> = {}) {
  const prefix = String.fromCharCode(65 + (prefixCounter++ % 26));
  return prisma.canteen.create({
    data: {
      name: o.name ?? `Canteen ${prefix}`,
      location: 'Test Block',
      tokenPrefix: prefix,
      isOpen: o.isOpen ?? true,
      fssaiLicenseNo: 'TEST',
      operatingHours: o.hours ?? { open: '00:00', close: '23:59' },
    },
  });
}

export async function makeUser(role: 'student' | 'staff' | 'admin', o: { canteenId?: string; balancePaise?: number; email?: string } = {}) {
  const user = await prisma.user.create({
    data: { name: `${role}-${rid()}`, email: o.email ?? `${role}-${rid()}@test.edu`, role, canteenId: role === 'staff' ? o.canteenId : null },
  });
  if (role === 'student') {
    await prisma.wallet.create({ data: { userId: user.id, balance: fromPaise(o.balancePaise ?? 0) } });
  }
  return user;
}

export const bearer = (u: { id: string; role: 'student' | 'staff' | 'admin'; canteenId: string | null }) => ({
  Authorization: `Bearer ${signAccessToken({ id: u.id, role: u.role, canteenId: u.canteenId })}`,
});

export async function makeMenuItem(canteenId: string, o: Partial<{ name: string; pricePaise: number; available: boolean; basePrepSeconds: number; weight: number }> = {}) {
  return prisma.menuItem.create({
    data: {
      canteenId,
      name: o.name ?? `Item ${rid()}`,
      price: fromPaise(o.pricePaise ?? 5000),
      category: 'Snacks',
      isAvailable: o.available ?? true,
      prep: { create: { basePrepSeconds: o.basePrepSeconds ?? 180, prepComplexityWeight: o.weight ?? 1 } },
    },
  });
}

/** Inserts an order row directly (no business logic). For phases that need orders without the orders phase. */
export async function makeOrder(o: {
  studentId: string;
  canteenId: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  totalPaise?: number;
  walletPaise?: number;
  placedAt?: Date | null;
  expiresAt?: Date | null;
  estimatedPrepSeconds?: number | null;
  items?: { menuItemId: string; quantity: number; pricePaise: number }[];
}) {
  const total = o.totalPaise ?? 10000;
  const wallet = o.walletPaise ?? 0;
  return prisma.order.create({
    data: {
      orderUid: `PKT-TEST-${rid().toUpperCase()}`,
      clientRequestId: crypto.randomUUID(),
      tokenNo: `T-${Math.floor(Math.random() * 900) + 100}`,
      pickupSalt: rid(),
      studentId: o.studentId,
      canteenId: o.canteenId,
      status: o.status ?? 'placed',
      paymentStatus: o.paymentStatus ?? 'paid',
      totalAmount: fromPaise(total),
      walletAmountApplied: fromPaise(wallet),
      gatewayAmount: fromPaise(total - wallet),
      placedAt: o.placedAt === undefined ? new Date() : o.placedAt,
      expiresAt: o.expiresAt ?? null,
      estimatedPrepSeconds: o.estimatedPrepSeconds ?? 600,
      items: o.items
        ? { create: o.items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity, priceAtOrderTime: fromPaise(i.pricePaise) })) }
        : undefined,
    },
  });
}

/** supertest agent over an app that mounts only the given modules. */
export const appWith = (...modules: BackendModule[]) => request(buildApp(modules));
