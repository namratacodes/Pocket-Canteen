import http from 'http';
import type { AddressInfo } from 'net';
import { io as ioc, type Socket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signAccessToken } from '../../src/lib/jwt';
import { prisma } from '../../src/lib/prisma';
import platformModule from '../../src/modules/platform';
import { deps } from '../../src/modules/platform/health';
import { etaTicker } from '../../src/modules/platform/jobs';
import { attachSocketServer } from '../../src/modules/platform/socket';
import { defaultRecorder, realtime, setRealtimeImpl } from '../../src/realtime/emitter';
import { appWith, bearer, makeCanteen, makeMenuItem, makeOrder, makeUser, resetDb } from '../helpers';

beforeEach(resetDb);

describe('queue + health', () => {
  it('queue counts only placed and preparing', async () => {
    const api = appWith(platformModule);
    const c = await makeCanteen();
    const s = await makeUser('student');
    const it1 = await makeMenuItem(c.id);
    const items = [{ menuItemId: it1.id, quantity: 1, pricePaise: 5000 }];
    for (const status of ['placed', 'preparing', 'ready', 'completed', 'pending_payment', 'cancelled'] as const) {
      await makeOrder({ studentId: s.id, canteenId: c.id, status, items });
    }
    const r = await api.get(`/api/v1/canteens/${c.id}/queue`).set(bearer(s));
    expect(r.status).toBe(200);
    expect(r.body.data.queueDepth).toBe(2);
    expect(r.body.data.estimatedWaitSeconds).toBe(180 + 240);
    expect((await api.get('/api/v1/canteens/00000000-0000-4000-8000-000000000000/queue').set(bearer(s))).status).toBe(404);
    expect((await api.get(`/api/v1/canteens/${c.id}/queue`)).status).toBe(401);
  });

  it('/health ok, /ready 200 and 503 when DB check fails', async () => {
    const api = appWith(platformModule);
    expect((await api.get('/health')).body).toEqual({ status: 'ok' });
    expect((await api.get('/ready')).status).toBe(200);
    const orig = deps.checkDb;
    deps.checkDb = async () => { throw new Error('db down'); };
    try {
      const r = await api.get('/ready');
      expect(r.status).toBe(503);
      expect(r.body).toEqual({ status: 'unavailable' });
    } finally { deps.checkDb = orig; }
  });
});

describe('sockets', () => {
  let server: http.Server;
  let io: ReturnType<typeof attachSocketServer>;
  let url: string;
  const open: Socket[] = [];

  beforeEach(async () => {
    server = http.createServer();
    io = attachSocketServer(server);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterEach(async () => {
    open.splice(0).forEach((s) => s.close());
    await io.close();
    setRealtimeImpl(defaultRecorder);
  });

  const tok = (u: { id: string; role: 'student' | 'staff' | 'admin'; canteenId: string | null }) => signAccessToken(u);
  const connect = (token: string) =>
    new Promise<Socket>((resolve, reject) => {
      const s = ioc(url, { auth: { token }, transports: ['websocket'], reconnection: false });
      open.push(s);
      s.on('connect', () => resolve(s));
      s.on('connect_error', reject);
    });
  const listen = (s: Socket, ev: string, ms = 300) =>
    new Promise<any>((resolve) => {
      const t = setTimeout(() => resolve(null), ms);
      s.once(ev, (p) => { clearTimeout(t); resolve(p); });
    });

  it('rejects missing and bad tokens', async () => {
    await expect(connect('')).rejects.toBeTruthy();
    await expect(connect('garbage')).rejects.toBeTruthy();
  });

  it('delivers user events only to that user', async () => {
    const a = await makeUser('student'); const b = await makeUser('student');
    const sa = await connect(tok({ id: a.id, role: 'student', canteenId: null }));
    const sb = await connect(tok({ id: b.id, role: 'student', canteenId: null }));
    const pa = listen(sa, 'order:ready'); const pb = listen(sb, 'order:ready');
    realtime.toUser(a.id, 'order:ready', { orderId: 'o1', tokenNo: 'A-1' });
    expect(await pa).toEqual({ orderId: 'o1', tokenNo: 'A-1' });
    expect(await pb).toBeNull();
  });

  it('staff get only their own canteen; clients cannot join canteen rooms', async () => {
    const cA = await makeCanteen(); const cB = await makeCanteen();
    const stA = await makeUser('staff', { canteenId: cA.id }); const stB = await makeUser('staff', { canteenId: cB.id });
    const stu = await makeUser('student');
    const sA = await connect(tok({ id: stA.id, role: 'staff', canteenId: cA.id }));
    const sB = await connect(tok({ id: stB.id, role: 'staff', canteenId: cB.id }));
    const sStu = await connect(tok({ id: stu.id, role: 'student', canteenId: null }));
    sStu.emit('join', `canteen:${cA.id}`);
    sStu.emit('subscribe:menu', { canteenId: `canteen:${cA.id}` });
    await new Promise((r) => setTimeout(r, 100));
    const pA = listen(sA, 'order:pickup_locked'); const pB = listen(sB, 'order:pickup_locked'); const pS = listen(sStu, 'order:pickup_locked');
    realtime.toCanteen(cA.id, 'order:pickup_locked', { orderId: 'o', tokenNo: 'A-9' });
    expect(await pA).toBeTruthy();
    expect(await pB).toBeNull();
    expect(await pS).toBeNull();
  });

  it('subscribe:menu joins the menu room; admins get admin events', async () => {
    const c = await makeCanteen();
    const stu = await makeUser('student'); const adm = await makeUser('admin');
    const sStu = await connect(tok({ id: stu.id, role: 'student', canteenId: null }));
    const sAdm = await connect(tok({ id: adm.id, role: 'admin', canteenId: null }));
    const ack = await new Promise<any>((r) => sStu.emit('subscribe:menu', { canteenId: c.id }, r));
    expect(ack).toEqual({ ok: true });
    const pm = listen(sStu, 'canteen:status_changed'); const pa = listen(sAdm, 'order:pickup_locked');
    realtime.toMenuRoom(c.id, 'canteen:status_changed', { canteenId: c.id, isOpen: false });
    realtime.toAdmins('order:pickup_locked', { orderId: 'o', tokenNo: 'A-1' });
    expect(await pm).toEqual({ canteenId: c.id, isOpen: false });
    expect(await pa).toBeTruthy();
  });
});

describe('etaTicker', () => {
  it('updates predicted_ready_at on real change, skips small changes, keeps the original estimate', async () => {
    const c = await makeCanteen();
    const s = await makeUser('student');
    const m = await makeMenuItem(c.id, { basePrepSeconds: 180 });
    const items = [{ menuItemId: m.id, quantity: 1, pricePaise: 5000 }];
    const changed = await makeOrder({ studentId: s.id, canteenId: c.id, status: 'placed', items, estimatedPrepSeconds: 600 });
    const same = await makeOrder({ studentId: s.id, canteenId: c.id, status: 'placed', items, estimatedPrepSeconds: 600, placedAt: new Date(Date.now() - 1000) });
    await prisma.order.update({ where: { id: changed.id }, data: { predictedReadyAt: new Date(Date.now() + 3600_000), placedAt: new Date(Date.now() - 5000) } });
    // `same` is now the earliest placed order, so nobody is ahead of it: 180s
    await prisma.order.update({ where: { id: same.id }, data: { predictedReadyAt: new Date(Date.now() + 180_000), placedAt: new Date(Date.now() - 10_000) } });
    const before = (await prisma.order.findUniqueOrThrow({ where: { id: same.id } })).predictedReadyAt!.getTime();

    await etaTicker();

    const a = await prisma.order.findUniqueOrThrow({ where: { id: changed.id } });
    expect(a.predictedReadyAt!.getTime()).toBeLessThan(Date.now() + 600_000);
    expect(a.estimatedPrepSeconds).toBe(600);
    expect(defaultRecorder.calls.filter((e) => e.event === 'order:eta_updated' && e.id === s.id)).toHaveLength(1);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: same.id } })).predictedReadyAt!.getTime()).toBe(before);
  });
});
