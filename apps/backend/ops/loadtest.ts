/**
 * Load test tool (NOT part of npm test).
 *   BASE_URL=http://localhost:4000 npx tsx ops/loadtest.ts
 * Needs a running backend (all modules) with seeded canteens and menu items, and the fake gateway.
 */
import crypto from 'crypto';
import { signAccessToken } from '../src/lib/jwt';
import { fromPaise } from '../src/lib/money';
import { prisma } from '../src/lib/prisma';

const BASE = process.env.BASE_URL ?? 'http://localhost:4000';
const DURATION_MS = 120_000;
const RATE_PER_SEC = 3;

const pct = (a: number[], p: number) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))] : 0);

async function main() {
  const canteens = await prisma.canteen.findMany({ include: { menuItems: { where: { isAvailable: true } } } });
  const usable = canteens.filter((c) => c.menuItems.length > 0);
  if (!usable.length) throw new Error('No canteens with available items. Seed first.');

  const students = [];
  for (let i = 0; i < 20; i++) {
    const u = await prisma.user.create({ data: { name: `load-${i}`, email: `load-${crypto.randomBytes(4).toString('hex')}@test.edu`, role: 'student' } });
    await prisma.wallet.create({ data: { userId: u.id, balance: fromPaise(500_000) } });
    students.push({ id: u.id, token: signAccessToken({ id: u.id, role: 'student', canteenId: null }) });
  }

  const latencies: number[] = [];
  let ok = 0, fail = 0;
  const one = async () => {
    const s = students[Math.floor(Math.random() * students.length)];
    const c = usable[Math.floor(Math.random() * usable.length)];
    const picks = [...c.menuItems].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
    const t0 = Date.now();
    try {
      const r = await fetch(`${BASE}/api/v1/orders`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${s.token}`, 'idempotency-key': crypto.randomUUID() },
        body: JSON.stringify({ canteenId: c.id, items: picks.map((p) => ({ menuItemId: p.id, quantity: 1 + Math.floor(Math.random() * 2) })), useWallet: Math.random() < 0.5 }),
      });
      latencies.push(Date.now() - t0);
      if (!r.ok) return void fail++;
      ok++;
      const j: any = await r.json();
      if (j.data.payment?.gatewayOrderId) await fetch(`${BASE}/api/v1/dev/payments/${j.data.payment.gatewayOrderId}/capture`, { method: 'POST' });
    } catch {
      fail++;
    }
  };

  const timer = setInterval(() => { for (let i = 0; i < RATE_PER_SEC; i++) void one(); }, 1000);
  await new Promise((r) => setTimeout(r, DURATION_MS));
  clearInterval(timer);
  await new Promise((r) => setTimeout(r, 3000));

  console.log({ ok, fail, successRate: `${((ok / Math.max(1, ok + fail)) * 100).toFixed(1)}%`, p50ms: pct(latencies, 50), p95ms: pct(latencies, 95) });
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
