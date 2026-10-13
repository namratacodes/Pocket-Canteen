import argon2 from 'argon2';
import { prisma } from '../../src/lib/prisma';
import { CANTEENS, ensureCanteens } from './_shared';

export default async function seed() {
  // 1. Ensure 5 canteens exist
  const canteens = await ensureCanteens();

  // 2. Ensure active payment account per canteen
  for (const c of CANTEENS) {
    const canteen = canteens[c.prefix];
    const existing = await prisma.canteenPaymentAccount.findFirst({
      where: { canteenId: canteen.id, isActive: true },
    });

    if (existing) {
      await prisma.canteenPaymentAccount.update({
        where: { id: existing.id },
        data: {
          razorpayAccountRef: `acc_DEMO_${c.prefix}`,
          bankAccountLast4: '0000',
          kycStatus: 'verified',
        },
      });
    } else {
      await prisma.canteenPaymentAccount.create({
        data: {
          canteenId: canteen.id,
          razorpayAccountRef: `acc_DEMO_${c.prefix}`,
          bankAccountLast4: '0000',
          kycStatus: 'verified',
          isActive: true,
        },
      });
    }
  }

  // 3. Admin user
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  const adminHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email: 'admin@pocketcanteen.test' },
    update: {
      name: 'Platform Admin',
      role: 'admin',
      passwordHash: adminHash,
      isActive: true,
    },
    create: {
      email: 'admin@pocketcanteen.test',
      name: 'Platform Admin',
      role: 'admin',
      passwordHash: adminHash,
      isActive: true,
    },
  });

  // 4. One staff per canteen
  const staffHash = await argon2.hash('Staff@12345', { type: argon2.argon2id });
  for (const c of CANTEENS) {
    const canteen = canteens[c.prefix];
    const staffEmail = `staff.${c.prefix.toLowerCase()}@pocketcanteen.test`;

    await prisma.user.upsert({
      where: { email: staffEmail },
      update: {
        name: `${canteen.name} Staff`,
        role: 'staff',
        canteenId: canteen.id,
        passwordHash: staffHash,
        isActive: true,
      },
      create: {
        email: staffEmail,
        name: `${canteen.name} Staff`,
        role: 'staff',
        canteenId: canteen.id,
        passwordHash: staffHash,
        isActive: true,
      },
    });
  }

  // 5. Demo student + wallet
  const student = await prisma.user.upsert({
    where: { email: 'demo.student@pocketcanteen.test' },
    update: {
      name: 'Demo Student',
      role: 'student',
      isActive: true,
    },
    create: {
      email: 'demo.student@pocketcanteen.test',
      name: 'Demo Student',
      role: 'student',
      isActive: true,
    },
  });

  await prisma.wallet.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      balance: 0,
    },
  });
}
